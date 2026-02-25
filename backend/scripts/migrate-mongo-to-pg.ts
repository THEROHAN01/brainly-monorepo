/**
 * MongoDB → PostgreSQL data migration script.
 *
 * Reads all data from the MongoDB database and inserts it into PostgreSQL.
 * Run once when switching from MongoDB to PostgreSQL.
 *
 * Prerequisites:
 *   - MONGO_URI must point to the source MongoDB database
 *   - DATABASE_URL must point to the target PostgreSQL database (migrated schema)
 *   - npm run db:migrate must have been run first (tables must exist)
 *
 * Usage:
 *   npm run migrate:data
 *
 * The script is idempotent-safe: it maps ObjectIds to UUIDs and skips
 * records that fail due to unique constraint violations.
 */

import mongoose, { Schema } from "mongoose";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import * as dotenv from "dotenv";

dotenv.config();

// ── Inline Mongoose models (since we removed mongoose from main code) ───────
const UserSchema = new Schema({
    username: String,
    email: String,
    password: String,
    googleId: String,
    profilePicture: String,
    authProvider: { type: String, default: "local" },
    createdAt: { type: Date, default: Date.now },
});

const TagSchema = new Schema({
    name: String,
    userId: mongoose.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
});

const ContentSchema = new Schema(
    {
        title: String,
        link: String,
        contentId: String,
        type: String,
        tags: [mongoose.Types.ObjectId],
        userId: mongoose.Types.ObjectId,
        enrichmentStatus: String,
        enrichmentError: String,
        enrichmentRetries: Number,
        enrichedAt: Date,
        metadata: mongoose.Schema.Types.Mixed,
    },
    { timestamps: true }
);

const LinkSchema = new Schema({
    hash: String,
    userId: mongoose.Types.ObjectId,
});

// ── Migration ────────────────────────────────────────────────────────────────
async function migrate() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI not set");
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connecting to PostgreSQL...");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const pgDb = drizzle(pool, { schema });

    const UserModel = mongoose.model("User", UserSchema);
    const TagModel = mongoose.model("Tag", TagSchema);
    const ContentModel = mongoose.model("Content", ContentSchema);
    const LinkModel = mongoose.model("Link", LinkSchema);

    // Maps: MongoDB ObjectId string → PostgreSQL UUID
    const userIdMap = new Map<string, string>();
    const tagIdMap = new Map<string, string>();

    let skipped = 0;

    // ── 1. Migrate Users ─────────────────────────────────────────────────────
    const users = await UserModel.find({});
    console.log(`\nMigrating ${users.length} users...`);

    for (const u of users) {
        try {
            const [inserted] = await pgDb.insert(schema.users).values({
                username: u.username ?? undefined,
                email: u.email ?? undefined,
                password: u.password ?? undefined,
                googleId: u.googleId ?? undefined,
                profilePicture: u.profilePicture ?? undefined,
                authProvider: (u.authProvider as string) ?? "local",
                createdAt: u.createdAt ?? new Date(),
            }).returning();
            userIdMap.set(u._id.toString(), inserted.id);
        } catch (err: any) {
            if (err.code === "23505") { // unique violation — already migrated
                skipped++;
            } else {
                console.warn(`  ⚠ User "${u.username}": ${err.message}`);
            }
        }
    }
    console.log(`  ✓ ${userIdMap.size} users migrated, ${skipped} skipped`);
    skipped = 0;

    // ── 2. Migrate Tags ──────────────────────────────────────────────────────
    const allTags = await TagModel.find({});
    console.log(`Migrating ${allTags.length} tags...`);

    for (const t of allTags) {
        const pgUserId = userIdMap.get(t.userId!.toString());
        if (!pgUserId) {
            console.warn(`  ⚠ Tag "${t.name}" skipped — owner not found`);
            skipped++;
            continue;
        }
        try {
            const [inserted] = await pgDb.insert(schema.tags).values({
                name: t.name!,
                userId: pgUserId,
                createdAt: t.createdAt ?? new Date(),
            }).returning();
            tagIdMap.set(t._id.toString(), inserted.id);
        } catch (err: any) {
            if (err.code === "23505") { skipped++; }
            else console.warn(`  ⚠ Tag "${t.name}": ${err.message}`);
        }
    }
    console.log(`  ✓ ${tagIdMap.size} tags migrated, ${skipped} skipped`);
    skipped = 0;

    // ── 3. Migrate Contents ──────────────────────────────────────────────────
    const allContent = await ContentModel.find({});
    console.log(`Migrating ${allContent.length} content items...`);
    let contentMigrated = 0;

    for (const c of allContent) {
        const pgUserId = userIdMap.get(c.userId!.toString());
        if (!pgUserId) {
            console.warn(`  ⚠ Content "${c.title}" skipped — owner not found`);
            skipped++;
            continue;
        }

        const meta: any = (c as any).metadata ?? {};
        try {
            const [inserted] = await pgDb.insert(schema.contents).values({
                title: c.title!,
                link: c.link!,
                contentId: c.contentId ?? undefined,
                type: c.type!,
                userId: pgUserId,
                enrichmentStatus: c.enrichmentStatus ?? "pending",
                enrichmentError: c.enrichmentError ?? undefined,
                enrichmentRetries: c.enrichmentRetries ?? 0,
                enrichedAt: c.enrichedAt ?? undefined,
                metaTitle: meta.title ?? undefined,
                metaDescription: meta.description ?? undefined,
                metaAuthor: meta.author ?? undefined,
                metaAuthorUrl: meta.authorUrl ?? undefined,
                metaThumbnail: meta.thumbnailUrl ?? undefined,
                metaPublishedAt: meta.publishedDate ? new Date(meta.publishedDate) : undefined,
                metaTags: meta.tags ?? undefined,
                metaLanguage: meta.language ?? undefined,
                fullText: meta.fullText ?? undefined,
                fullTextType: meta.fullTextType ?? undefined,
                transcriptSegments: meta.transcriptSegments ?? undefined,
                providerData: meta.providerData ?? undefined,
                extractedAt: meta.extractedAt ?? undefined,
                extractorVersion: meta.extractorVersion ?? undefined,
                createdAt: (c as any).createdAt ?? new Date(),
                updatedAt: (c as any).updatedAt ?? new Date(),
            }).returning();

            // Migrate tag associations
            const tagJunctions = ((c.tags as any[]) ?? [])
                .map((mongoTagId: any) => {
                    const pgTagId = tagIdMap.get(mongoTagId.toString());
                    return pgTagId ? { contentId: inserted.id, tagId: pgTagId } : null;
                })
                .filter(Boolean) as { contentId: string; tagId: string }[];

            if (tagJunctions.length > 0) {
                await pgDb.insert(schema.contentTags).values(tagJunctions);
            }

            contentMigrated++;
        } catch (err: any) {
            if (err.code === "23505") { skipped++; }
            else console.warn(`  ⚠ Content "${c.title}": ${err.message}`);
        }
    }
    console.log(`  ✓ ${contentMigrated} content items migrated, ${skipped} skipped`);
    skipped = 0;

    // ── 4. Migrate Share Links ───────────────────────────────────────────────
    const allLinks = await LinkModel.find({});
    console.log(`Migrating ${allLinks.length} share links...`);
    let linksMigrated = 0;

    for (const l of allLinks) {
        const pgUserId = userIdMap.get(l.userId!.toString());
        if (!pgUserId) { skipped++; continue; }
        try {
            await pgDb.insert(schema.shareLinks).values({ hash: l.hash!, userId: pgUserId });
            linksMigrated++;
        } catch (err: any) {
            if (err.code === "23505") { skipped++; }
            else console.warn(`  ⚠ Link "${l.hash}": ${err.message}`);
        }
    }
    console.log(`  ✓ ${linksMigrated} share links migrated, ${skipped} skipped`);

    console.log("\n✅ Migration complete!");
    console.log(`  Users:        ${userIdMap.size}`);
    console.log(`  Tags:         ${tagIdMap.size}`);
    console.log(`  Content:      ${contentMigrated}`);
    console.log(`  Share Links:  ${linksMigrated}`);

    await mongoose.disconnect();
    await pool.end();
}

migrate().catch((err) => {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
});
