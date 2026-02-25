# Phase 0: PostgreSQL + pgai Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Brainly's backend from MongoDB/Mongoose to PostgreSQL/Drizzle ORM + pgai, preserving all existing API behavior so the frontend works identically.

**Architecture:** Replace Mongoose models with Drizzle ORM schemas on PostgreSQL. Add pgai extension for automatic vector embeddings of content. Set up Docker Compose for local dev (PostgreSQL + pgai vectorizer worker). Add Vercel AI SDK as LLM abstraction layer. Existing API response shapes stay the same — frontend should require zero changes.

**Tech Stack:** PostgreSQL 17, Drizzle ORM, drizzle-kit, pgai (Timescale), Docker Compose, Vercel AI SDK (`ai` package), `@ai-sdk/openai`

**Important:** The frontend uses `_id` as the content/tag identifier field (MongoDB convention). The migration must either: (a) return `_id` in API responses by aliasing the `id` column, or (b) update the frontend to use `id`. We'll go with approach (a) — backend response transformation — to keep frontend untouched.

---

## Task 1: Docker Compose for PostgreSQL + pgai

**Files:**
- Create: `backend/docker-compose.yml`
- Create: `backend/.env.example`

**Step 1: Create Docker Compose file**

```yaml
# backend/docker-compose.yml
services:
  db:
    image: timescale/timescaledb-ha:pg17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-brainly_dev}
      POSTGRES_USER: ${POSTGRES_USER:-brainly}
      POSTGRES_DB: ${POSTGRES_DB:-brainly}
    volumes:
      - pgdata:/home/postgres/pgdata/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U brainly"]
      interval: 5s
      timeout: 5s
      retries: 5

  vectorizer-worker:
    image: timescale/pgai-vectorizer-worker:latest
    environment:
      PGAI_VECTORIZER_WORKER_DB_URL: postgres://${POSTGRES_USER:-brainly}:${POSTGRES_PASSWORD:-brainly_dev}@db:5432/${POSTGRES_DB:-brainly}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

**Step 2: Create .env.example with all required env vars**

```env
# backend/.env.example

# PostgreSQL
POSTGRES_USER=brainly
POSTGRES_PASSWORD=brainly_dev
POSTGRES_DB=brainly
DATABASE_URL=postgres://brainly:brainly_dev@localhost:5432/brainly

# MongoDB (legacy — remove after migration)
MONGO_URL=mongodb://localhost:27017/brainly

# Auth
JWT_SECRET=your-jwt-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# API Keys (optional — extractors degrade gracefully)
YOUTUBE_API_KEY=
GITHUB_TOKEN=
TWITTER_BEARER_TOKEN=
INSTAGRAM_APP_ID=

# AI / pgai
OPENAI_API_KEY=your-openai-api-key
```

**Step 3: Start database and install pgai extensions**

Run:
```bash
cd backend
docker compose up -d db
docker compose run --rm --entrypoint \
  "python -m pgai install -d postgres://brainly:brainly_dev@db:5432/brainly" \
  vectorizer-worker
docker compose up -d
```

Expected: PostgreSQL running on port 5432, pgai extensions installed, vectorizer worker running.

**Step 4: Verify pgai is working**

Run:
```bash
docker compose exec db psql -U brainly -c "CREATE EXTENSION IF NOT EXISTS ai CASCADE; SELECT extversion FROM pg_extension WHERE extname = 'ai';"
```

Expected: Extension created, version number returned.

**Step 5: Commit**

```bash
git add backend/docker-compose.yml backend/.env.example
git commit -m "chore: add Docker Compose for PostgreSQL + pgai local dev"
```

---

## Task 2: Install Drizzle ORM + dependencies

**Files:**
- Modify: `backend/package.json`
- Create: `backend/drizzle.config.ts`

**Step 1: Install new dependencies**

Run:
```bash
cd backend
npm install drizzle-orm pg dotenv
npm install -D drizzle-kit @types/pg
```

**Step 2: Create Drizzle config**

```typescript
// backend/drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/drizzle.config.ts
git commit -m "chore: install Drizzle ORM and configure drizzle-kit"
```

---

## Task 3: Define Drizzle schema

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/relations.ts`

**Step 1: Write the schema file**

```typescript
// backend/src/db/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  profilePicture: text("profile_picture"),
  authProvider: varchar("auth_provider", { length: 20 }).default("local").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Tags ───────────────────────────────────────────────
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_tag_name_user").on(t.name, t.userId)]
);

// ── Contents ───────────────────────────────────────────
export const contents = pgTable(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    link: text("link").notNull(),
    contentId: text("content_id"),
    type: varchar("type", { length: 30 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Enrichment tracking
    enrichmentStatus: varchar("enrichment_status", { length: 20 }).default("pending").notNull(),
    enrichmentError: text("enrichment_error"),
    enrichmentRetries: integer("enrichment_retries").default(0).notNull(),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),

    // Metadata (flattened from MongoDB nested object)
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    metaAuthor: text("meta_author"),
    metaAuthorUrl: text("meta_author_url"),
    metaThumbnail: text("meta_thumbnail"),
    metaPublishedAt: timestamp("meta_published_at", { withTimezone: true }),
    metaTags: jsonb("meta_tags").$type<string[]>(),
    metaLanguage: varchar("meta_language", { length: 10 }),
    fullText: text("full_text"),
    fullTextType: varchar("full_text_type", { length: 20 }),
    transcriptSegments: jsonb("transcript_segments").$type<
      Array<{ text: string; start: number; duration: number }>
    >(),
    providerData: jsonb("provider_data"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
    extractorVersion: varchar("extractor_version", { length: 20 }),

    // AI fields (Phase 1+)
    summary: text("summary"),
    aiTags: jsonb("ai_tags").$type<string[]>(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_contents_user_created").on(t.userId, t.createdAt),
    index("idx_contents_enrichment").on(t.enrichmentStatus, t.createdAt),
  ]
);

// ── Content-Tags junction ──────────────────────────────
export const contentTags = pgTable(
  "content_tags",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.contentId, t.tagId] })]
);

// ── Share Links ────────────────────────────────────────
export const shareLinks = pgTable("share_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  hash: varchar("hash", { length: 20 }).unique().notNull(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
});
```

**Step 2: Write the relations file**

```typescript
// backend/src/db/relations.ts
import { relations } from "drizzle-orm";
import { users, tags, contents, contentTags, shareLinks } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  contents: many(contents),
  tags: many(tags),
  shareLink: one(shareLinks, { fields: [users.id], references: [shareLinks.userId] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  contentTags: many(contentTags),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  user: one(users, { fields: [contents.userId], references: [users.id] }),
  contentTags: many(contentTags),
}));

export const contentTagsRelations = relations(contentTags, ({ one }) => ({
  content: one(contents, { fields: [contentTags.contentId], references: [contents.id] }),
  tag: one(tags, { fields: [contentTags.tagId], references: [tags.id] }),
}));

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
  user: one(users, { fields: [shareLinks.userId], references: [users.id] }),
}));
```

**Step 3: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/relations.ts
git commit -m "feat: define Drizzle ORM schema for PostgreSQL migration"
```

---

## Task 4: Generate and run initial migration

**Files:**
- Generated: `backend/drizzle/*.sql` (auto-generated by drizzle-kit)

**Step 1: Generate migration SQL**

Run:
```bash
cd backend
npx drizzle-kit generate
```

Expected: Creates `backend/drizzle/0000_*.sql` with CREATE TABLE statements.

**Step 2: Review the generated SQL**

Read the generated file. Verify it matches the design doc schema.

**Step 3: Run migration against local PostgreSQL**

Run:
```bash
cd backend
DATABASE_URL=postgres://brainly:brainly_dev@localhost:5432/brainly npx drizzle-kit migrate
```

Expected: Tables created in PostgreSQL.

**Step 4: Verify tables exist**

Run:
```bash
docker compose exec db psql -U brainly -c "\dt"
```

Expected: users, tags, contents, content_tags, share_links tables listed.

**Step 5: Commit**

```bash
git add backend/drizzle/
git commit -m "chore: generate initial Drizzle migration for PostgreSQL"
```

---

## Task 5: Create database connection module

**Files:**
- Create: `backend/src/db/index.ts`

**Step 1: Write the connection module**

```typescript
// backend/src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema: { ...schema, ...relations } });

export { schema };
export type DB = typeof db;
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors related to the new db module.

**Step 3: Commit**

```bash
git add backend/src/db/index.ts
git commit -m "feat: add Drizzle database connection module"
```

---

## Task 6: Migrate auth routes (signup, signin, Google OAuth, /me)

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/middleware.ts`

This is the biggest task. We replace every Mongoose model call with Drizzle queries while keeping the exact same API request/response shapes.

**Critical:** The frontend expects `_id` field on objects. Drizzle returns `id`. All response objects must be transformed: `{ _id: row.id, ...rest }`.

**Step 1: Create a response helper for _id aliasing**

Add to a new utility file:

```typescript
// backend/src/db/transforms.ts

// Transform a DB row's `id` to `_id` for frontend compatibility
export function withMongoId<T extends { id: string }>(
  row: T
): Omit<T, "id"> & { _id: string } {
  const { id, ...rest } = row;
  return { _id: id, ...rest } as any;
}
```

**Step 2: Replace signup route**

In `backend/src/index.ts`, replace the signup handler's Mongoose calls:

**Old (Mongoose):**
```typescript
const existingUser = await UserModel.findOne({ username });
const user = new UserModel({ username, password: hashedPassword });
await user.save();
```

**New (Drizzle):**
```typescript
import { db, schema } from "./db";
import { eq } from "drizzle-orm";

const [existingUser] = await db
  .select()
  .from(schema.users)
  .where(eq(schema.users.username, username))
  .limit(1);

if (existingUser) {
  return res.status(409).json({ message: "Username already taken" });
}

const [user] = await db
  .insert(schema.users)
  .values({ username, email, password: hashedPassword })
  .returning();
```

**Step 3: Replace signin route**

**Old:**
```typescript
const user = await UserModel.findOne({ username });
```

**New:**
```typescript
const [user] = await db
  .select()
  .from(schema.users)
  .where(eq(schema.users.username, username))
  .limit(1);
```

JWT generation stays the same — just use `user.id` instead of `user._id`.

**Step 4: Replace Google OAuth route**

**Old:**
```typescript
let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });
```

**New:**
```typescript
import { or } from "drizzle-orm";

let [user] = await db
  .select()
  .from(schema.users)
  .where(or(eq(schema.users.googleId, googleId), eq(schema.users.email, email)))
  .limit(1);
```

For creating / updating:
```typescript
// Create new user
const [newUser] = await db
  .insert(schema.users)
  .values({ username, email, googleId, profilePicture, authProvider: "google" })
  .returning();

// Update existing user to link Google
const [updated] = await db
  .update(schema.users)
  .set({ googleId, profilePicture, authProvider: "google" })
  .where(eq(schema.users.id, user.id))
  .returning();
```

**Step 5: Replace /me route**

**Old:**
```typescript
const user = await UserModel.findById(userId).select("-password -googleId");
```

**New:**
```typescript
const [user] = await db
  .select({
    id: schema.users.id,
    username: schema.users.username,
    email: schema.users.email,
    profilePicture: schema.users.profilePicture,
    authProvider: schema.users.authProvider,
  })
  .from(schema.users)
  .where(eq(schema.users.id, userId))
  .limit(1);

// Response: return { user: { id: user.id, ...user } }
```

**Step 6: Update middleware to work with UUIDs**

The JWT payload uses `id` (a UUID now). Middleware stays mostly the same — just ensure `req.userId` is a string UUID.

**Step 7: Test auth routes manually**

Run the server, test with curl:
```bash
# Signup
curl -X POST http://localhost:3000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456"}'

# Signin
curl -X POST http://localhost:3000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456"}'

# /me (use token from signin)
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer <token>"
```

Expected: All return correct JSON responses.

**Step 8: Commit**

```bash
git add backend/src/index.ts backend/src/middleware.ts backend/src/db/transforms.ts
git commit -m "feat: migrate auth routes from Mongoose to Drizzle"
```

---

## Task 7: Migrate content routes (create, list, delete)

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Replace POST /api/v1/content (create)**

**Old:**
```typescript
const validTags = await TagModel.find({ _id: { $in: tags }, userId });
const content = await ContentModel.create({ title, link, contentId, type, userId, tags });
```

**New:**
```typescript
import { inArray, and } from "drizzle-orm";

// Validate tags belong to user
const validTags = tags?.length
  ? await db
      .select()
      .from(schema.tags)
      .where(and(inArray(schema.tags.id, tags), eq(schema.tags.userId, userId)))
  : [];

// Create content
const [content] = await db
  .insert(schema.contents)
  .values({ title, link, contentId: cId, type: cType, userId })
  .returning();

// Create junction rows for tags
if (validTags.length > 0) {
  await db.insert(schema.contentTags).values(
    validTags.map((t) => ({ contentId: content.id, tagId: t.id }))
  );
}
```

Response must include `_id` and populated `tags` array:
```typescript
const tagObjects = validTags.map((t) => withMongoId(t));
res.json({ content: { ...withMongoId(content), tags: tagObjects } });
```

**Step 2: Replace GET /api/v1/content (list)**

This requires a join to get tags. Use Drizzle's relational query:

```typescript
const userContents = await db.query.contents.findMany({
  where: eq(schema.contents.userId, userId),
  with: {
    contentTags: {
      with: { tag: true },
    },
  },
  orderBy: (contents, { desc }) => [desc(contents.createdAt)],
});

// Transform to match frontend expected shape
const transformed = userContents.map((c) => ({
  _id: c.id,
  title: c.title,
  link: c.link,
  type: c.type,
  contentId: c.contentId,
  userId: c.userId,
  createdAt: c.createdAt,
  tags: c.contentTags.map((ct) => ({
    _id: ct.tag.id,
    name: ct.tag.name,
  })),
}));

res.json({ content: transformed });
```

**Step 3: Replace DELETE /api/v1/content**

```typescript
const [deleted] = await db
  .delete(schema.contents)
  .where(and(eq(schema.contents.id, contentId), eq(schema.contents.userId, userId)))
  .returning();

if (!deleted) {
  return res.status(404).json({ message: "Content not found" });
}
// Junction rows auto-deleted via ON DELETE CASCADE
```

**Step 4: Test content CRUD manually**

```bash
# Create content
curl -X POST http://localhost:3000/api/v1/content \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"link":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","title":"Test video"}'

# List contents
curl http://localhost:3000/api/v1/content \
  -H "Authorization: Bearer <token>"

# Delete
curl -X DELETE "http://localhost:3000/api/v1/content?id=<content-uuid>" \
  -H "Authorization: Bearer <token>"
```

**Step 5: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: migrate content CRUD routes from Mongoose to Drizzle"
```

---

## Task 8: Migrate tag routes

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Replace GET /api/v1/tags**

```typescript
const userTags = await db
  .select()
  .from(schema.tags)
  .where(eq(schema.tags.userId, userId))
  .orderBy(schema.tags.name);

res.json({ tags: userTags.map(withMongoId) });
```

**Step 2: Replace POST /api/v1/tags**

```typescript
const [existing] = await db
  .select()
  .from(schema.tags)
  .where(and(eq(schema.tags.name, trimmedName), eq(schema.tags.userId, userId)))
  .limit(1);

if (existing) {
  return res.status(409).json({ message: "Tag already exists", tag: withMongoId(existing) });
}

const [tag] = await db
  .insert(schema.tags)
  .values({ name: trimmedName, userId })
  .returning();

res.json({ tag: withMongoId(tag) });
```

**Step 3: Replace DELETE /api/v1/tags/:tagId**

```typescript
// Delete the tag (junction rows auto-deleted via CASCADE)
const [deleted] = await db
  .delete(schema.tags)
  .where(and(eq(schema.tags.id, tagId), eq(schema.tags.userId, userId)))
  .returning();
```

**Step 4: Replace PUT /api/v1/content/:contentId/tags (update tags on content)**

```typescript
// Verify content belongs to user
const [content] = await db
  .select()
  .from(schema.contents)
  .where(and(eq(schema.contents.id, contentId), eq(schema.contents.userId, userId)))
  .limit(1);

if (!content) return res.status(404).json({ message: "Content not found" });

// Validate tags belong to user
const validTags = tagIds.length
  ? await db
      .select()
      .from(schema.tags)
      .where(and(inArray(schema.tags.id, tagIds), eq(schema.tags.userId, userId)))
  : [];

// Replace all tags: delete existing, insert new
await db.delete(schema.contentTags).where(eq(schema.contentTags.contentId, contentId));

if (validTags.length > 0) {
  await db.insert(schema.contentTags).values(
    validTags.map((t) => ({ contentId, tagId: t.id }))
  );
}
```

**Step 5: Test tag routes**

```bash
# Create tag
curl -X POST http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"javascript"}'

# List tags
curl http://localhost:3000/api/v1/tags -H "Authorization: Bearer <token>"

# Delete tag
curl -X DELETE http://localhost:3000/api/v1/tags/<tag-uuid> \
  -H "Authorization: Bearer <token>"
```

**Step 6: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: migrate tag routes from Mongoose to Drizzle"
```

---

## Task 9: Migrate brain sharing routes

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Replace POST /api/v1/brain/share**

```typescript
if (share) {
  // Create share link
  const [existing] = await db
    .select()
    .from(schema.shareLinks)
    .where(eq(schema.shareLinks.userId, userId))
    .limit(1);

  if (existing) {
    return res.json({ hash: existing.hash });
  }

  const hash = crypto.randomBytes(5).toString("hex"); // 10-char hex
  const [link] = await db
    .insert(schema.shareLinks)
    .values({ hash, userId })
    .returning();

  return res.json({ hash: link.hash });
} else {
  // Delete share link
  await db.delete(schema.shareLinks).where(eq(schema.shareLinks.userId, userId));
  return res.json({ message: "Share link removed" });
}
```

**Step 2: Replace GET /api/v1/brain/:shareLink (public)**

```typescript
const [link] = await db
  .select()
  .from(schema.shareLinks)
  .where(eq(schema.shareLinks.hash, shareLink))
  .limit(1);

if (!link) return res.status(404).json({ message: "Share link not found" });

const [user] = await db
  .select({ username: schema.users.username })
  .from(schema.users)
  .where(eq(schema.users.id, link.userId))
  .limit(1);

const sharedContent = await db
  .select({
    id: schema.contents.id,
    title: schema.contents.title,
    link: schema.contents.link,
    type: schema.contents.type,
    contentId: schema.contents.contentId,
  })
  .from(schema.contents)
  .where(eq(schema.contents.userId, link.userId))
  .orderBy(schema.contents.createdAt);

res.json({
  username: user?.username,
  content: sharedContent.map((c) => ({ _id: c.id, ...c })),
});
```

**Step 3: Test sharing**

```bash
# Create share link
curl -X POST http://localhost:3000/api/v1/brain/share \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"share":true}'

# Get shared brain (public)
curl http://localhost:3000/api/v1/brain/<hash>
```

**Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: migrate brain sharing routes from Mongoose to Drizzle"
```

---

## Task 10: Migrate enrichment service

**Files:**
- Modify: `backend/src/services/enrichment.service.ts`

This is the most complex migration because of the MongoDB aggregation pipeline for fair batching.

**Step 1: Replace startup stale-reset**

**Old:**
```typescript
await ContentModel.updateMany(
  { enrichmentStatus: 'processing' },
  { enrichmentStatus: 'pending' }
);
```

**New:**
```typescript
await db
  .update(schema.contents)
  .set({ enrichmentStatus: "pending" })
  .where(eq(schema.contents.enrichmentStatus, "processing"));
```

**Step 2: Replace aggregation pipeline for fair batching**

The MongoDB aggregation groups by userId to pick one content per user. In PostgreSQL, use `DISTINCT ON`:

```typescript
import { sql, eq, and, or, lt, gt } from "drizzle-orm";

const retryAfter = new Date(Date.now() - config.extractors.retryDelayMs);

const batch = await db.execute(sql`
  SELECT DISTINCT ON (user_id)
    id, type, link, content_id, title, user_id, enrichment_retries, created_at
  FROM contents
  WHERE enrichment_status = 'pending'
    AND (
      enrichment_retries = 0
      OR (enrichment_retries > 0 AND enrichment_retries < ${config.extractors.maxRetries}
          AND updated_at < ${retryAfter})
    )
  ORDER BY user_id, created_at ASC
  LIMIT ${BATCH_SIZE}
`);
```

**Step 3: Replace atomic claim**

**Old:**
```typescript
const doc = await ContentModel.findOneAndUpdate(
  { _id: id, enrichmentStatus: 'pending' },
  { enrichmentStatus: 'processing' },
  { new: true }
);
```

**New:**
```typescript
const [claimed] = await db
  .update(schema.contents)
  .set({ enrichmentStatus: "processing", updatedAt: new Date() })
  .where(and(eq(schema.contents.id, id), eq(schema.contents.enrichmentStatus, "pending")))
  .returning();
```

**Step 4: Replace success update**

**Old:**
```typescript
await ContentModel.updateOne({ _id: id }, {
  enrichmentStatus: 'enriched',
  enrichedAt: new Date(),
  metadata: extractedMetadata,
});
```

**New:**
```typescript
await db
  .update(schema.contents)
  .set({
    enrichmentStatus: "enriched",
    enrichmentError: null,
    enrichedAt: new Date(),
    updatedAt: new Date(),
    // Flatten metadata into columns
    metaTitle: metadata.title ?? null,
    metaDescription: metadata.description ?? null,
    metaAuthor: metadata.author ?? null,
    metaAuthorUrl: metadata.authorUrl ?? null,
    metaThumbnail: metadata.thumbnailUrl ?? null,
    metaPublishedAt: metadata.publishedDate ? new Date(metadata.publishedDate) : null,
    metaTags: metadata.tags ?? null,
    metaLanguage: metadata.language ?? null,
    fullText: metadata.fullText ?? null,
    fullTextType: metadata.fullTextType ?? null,
    transcriptSegments: metadata.transcriptSegments ?? null,
    providerData: metadata.providerData ?? null,
    extractedAt: metadata.extractedAt ?? new Date(),
    extractorVersion: metadata.extractorVersion ?? null,
  })
  .where(eq(schema.contents.id, id));
```

**Step 5: Replace failure update**

```typescript
await db
  .update(schema.contents)
  .set({
    enrichmentStatus: maxedOut ? "failed" : "pending",
    enrichmentError: errorMessage,
    enrichmentRetries: newRetryCount,
    updatedAt: new Date(),
  })
  .where(eq(schema.contents.id, id));
```

**Step 6: Test enrichment cycle**

Start server, create a YouTube content entry, watch logs for enrichment processing:
```bash
cd backend && npm run dev
# Create content via curl, then watch logs for "enriched" status
```

**Step 7: Commit**

```bash
git add backend/src/services/enrichment.service.ts
git commit -m "feat: migrate enrichment service from Mongoose to Drizzle"
```

---

## Task 11: Remove Mongoose, clean up old db.ts

**Files:**
- Delete: `backend/src/db.ts` (old Mongoose schemas)
- Modify: `backend/src/index.ts` (remove Mongoose import + connection)
- Modify: `backend/package.json` (remove mongoose + mongodb)

**Step 1: Remove Mongoose connection from index.ts**

Remove the `mongoose.connect(...)` call and the Mongoose import from the server startup.

**Step 2: Remove old db.ts**

Delete `backend/src/db.ts` entirely. All models now live in `backend/src/db/schema.ts`.

**Step 3: Uninstall Mongoose**

Run:
```bash
cd backend
npm uninstall mongoose mongodb
```

**Step 4: Verify nothing references old models**

Run:
```bash
cd backend && grep -r "UserModel\|ContentModel\|TagModel\|LinkModel\|from.*['\"]\.\/db['\"]" src/
```

Expected: No matches (all replaced with Drizzle imports).

**Step 5: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: Clean compile.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Mongoose dependency, migration to Drizzle complete"
```

---

## Task 12: Set up pgai vectorizer for content embeddings

**Files:**
- Create: `backend/src/db/setup-pgai.ts`

**Step 1: Write pgai setup script**

```typescript
// backend/src/db/setup-pgai.ts
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

async function setupPgai() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Enable pgai extension
    await client.query("CREATE EXTENSION IF NOT EXISTS ai CASCADE;");
    console.log("pgai extension enabled");

    // Create vectorizer for content full_text
    await client.query(`
      SELECT ai.create_vectorizer(
        'contents'::regclass,
        loading    => ai.loading_column('full_text'),
        chunking   => ai.chunking_recursive_character_text_splitter(
                        chunk_size => 1000, chunk_overlap => 200),
        formatting => ai.formatting_python_template(
                        'Title: ' || '$title' || E'\\nType: ' || '$type' || E'\\n\\n' || '$chunk'),
        embedding  => ai.embedding_openai('text-embedding-3-small', 1536)
      );
    `);
    console.log("Vectorizer created for contents.full_text");
  } catch (err: any) {
    if (err.message?.includes("already exists")) {
      console.log("Vectorizer already exists, skipping");
    } else {
      throw err;
    }
  } finally {
    await client.end();
  }
}

setupPgai().catch(console.error);
```

**Step 2: Add npm script**

In `backend/package.json`, add:
```json
"scripts": {
  "setup:pgai": "npx tsx src/db/setup-pgai.ts"
}
```

**Step 3: Run setup**

Run:
```bash
cd backend
DATABASE_URL=postgres://brainly:brainly_dev@localhost:5432/brainly npm run setup:pgai
```

Expected: "pgai extension enabled" + "Vectorizer created"

**Step 4: Verify vectorizer exists**

```bash
docker compose exec db psql -U brainly -c "SELECT * FROM ai.vectorizer;"
```

**Step 5: Commit**

```bash
git add backend/src/db/setup-pgai.ts backend/package.json
git commit -m "feat: add pgai vectorizer setup for content embeddings"
```

---

## Task 13: Install and configure Vercel AI SDK

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/ai/shared/llm-client.ts`
- Create: `backend/src/ai/shared/types.ts`

**Step 1: Install AI SDK**

Run:
```bash
cd backend
npm install ai @ai-sdk/openai @ai-sdk/anthropic
```

**Step 2: Create LLM client abstraction**

```typescript
// backend/src/ai/shared/llm-client.ts
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

export type LLMProvider = "openai" | "anthropic";

const providers = {
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
};

export function getModel(provider: LLMProvider = "openai", modelId?: string) {
  switch (provider) {
    case "openai":
      return providers.openai(modelId ?? "gpt-4o-mini");
    case "anthropic":
      return providers.anthropic(modelId ?? "claude-sonnet-4-6-20250514");
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export function getDefaultModel() {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openai";
  return getModel(provider);
}
```

**Step 3: Create shared types**

```typescript
// backend/src/ai/shared/types.ts
export interface Summary {
  text: string;
  style: "brief" | "detailed" | "bullet-points";
  modelUsed: string;
}

export interface SearchResult {
  contentId: string;
  title: string;
  link: string;
  type: string;
  relevance: number;
  snippet: string;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
}
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add backend/src/ai/ backend/package.json backend/package-lock.json
git commit -m "feat: add Vercel AI SDK with provider-agnostic LLM client"
```

---

## Task 14: Write MongoDB-to-PostgreSQL data migration script

**Files:**
- Create: `backend/scripts/migrate-mongo-to-pg.ts`

This script reads all data from MongoDB and inserts it into PostgreSQL. Run once for existing data.

**Step 1: Write the migration script**

```typescript
// backend/scripts/migrate-mongo-to-pg.ts
import mongoose from "mongoose";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import dotenv from "dotenv";

dotenv.config();

// Re-define Mongoose models inline (since we removed mongoose from main code)
const UserSchema = new mongoose.Schema({
  username: String, email: String, password: String,
  googleId: String, profilePicture: String,
  authProvider: { type: String, default: "local" },
  createdAt: { type: Date, default: Date.now },
});

const TagSchema = new mongoose.Schema({
  name: String, userId: mongoose.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
});

const ContentSchema = new mongoose.Schema({
  title: String, link: String, contentId: String, type: String,
  tags: [mongoose.Types.ObjectId], userId: mongoose.Types.ObjectId,
  enrichmentStatus: String, enrichmentError: String,
  enrichmentRetries: Number, enrichedAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const LinkSchema = new mongoose.Schema({
  hash: String, userId: mongoose.Types.ObjectId,
});

async function migrate() {
  // Connect to both databases
  await mongoose.connect(process.env.MONGO_URL!);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const pgDb = drizzle(pool, { schema });

  const UserModel = mongoose.model("User", UserSchema);
  const TagModel = mongoose.model("Tag", TagSchema);
  const ContentModel = mongoose.model("Content", ContentSchema);
  const LinkModel = mongoose.model("Link", LinkSchema);

  // Maps: MongoDB ObjectId string → PostgreSQL UUID
  const userIdMap = new Map<string, string>();
  const tagIdMap = new Map<string, string>();
  const contentIdMap = new Map<string, string>();

  // 1. Migrate Users
  const users = await UserModel.find({});
  console.log(`Migrating ${users.length} users...`);
  for (const u of users) {
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
  }
  console.log(`  ✓ ${users.length} users migrated`);

  // 2. Migrate Tags
  const allTags = await TagModel.find({});
  console.log(`Migrating ${allTags.length} tags...`);
  for (const t of allTags) {
    const pgUserId = userIdMap.get(t.userId!.toString());
    if (!pgUserId) { console.warn(`  Skipping tag "${t.name}" — user not found`); continue; }
    const [inserted] = await pgDb.insert(schema.tags).values({
      name: t.name!,
      userId: pgUserId,
      createdAt: t.createdAt ?? new Date(),
    }).returning();
    tagIdMap.set(t._id.toString(), inserted.id);
  }
  console.log(`  ✓ ${allTags.length} tags migrated`);

  // 3. Migrate Contents
  const allContent = await ContentModel.find({});
  console.log(`Migrating ${allContent.length} contents...`);
  for (const c of allContent) {
    const pgUserId = userIdMap.get(c.userId!.toString());
    if (!pgUserId) { console.warn(`  Skipping content "${c.title}" — user not found`); continue; }
    const meta = (c as any).metadata ?? {};
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
    contentIdMap.set(c._id.toString(), inserted.id);

    // Migrate tag associations
    if (c.tags && c.tags.length > 0) {
      const junctionRows = c.tags
        .map((mongoTagId: any) => {
          const pgTagId = tagIdMap.get(mongoTagId.toString());
          return pgTagId ? { contentId: inserted.id, tagId: pgTagId } : null;
        })
        .filter(Boolean) as { contentId: string; tagId: string }[];

      if (junctionRows.length > 0) {
        await pgDb.insert(schema.contentTags).values(junctionRows);
      }
    }
  }
  console.log(`  ✓ ${allContent.length} contents migrated`);

  // 4. Migrate Share Links
  const allLinks = await LinkModel.find({});
  console.log(`Migrating ${allLinks.length} share links...`);
  for (const l of allLinks) {
    const pgUserId = userIdMap.get(l.userId!.toString());
    if (!pgUserId) continue;
    await pgDb.insert(schema.shareLinks).values({
      hash: l.hash!,
      userId: pgUserId,
    });
  }
  console.log(`  ✓ ${allLinks.length} share links migrated`);

  console.log("\n✅ Migration complete!");
  console.log(`  Users: ${userIdMap.size}`);
  console.log(`  Tags: ${tagIdMap.size}`);
  console.log(`  Contents: ${contentIdMap.size}`);
  console.log(`  Share Links: ${allLinks.length}`);

  await mongoose.disconnect();
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

**Step 2: Add npm script**

```json
"scripts": {
  "migrate:data": "npx tsx scripts/migrate-mongo-to-pg.ts"
}
```

**Step 3: Note — don't run yet**

This script should be run once when ready to switch over. For now, just commit it.

**Step 4: Commit**

```bash
git add backend/scripts/migrate-mongo-to-pg.ts backend/package.json
git commit -m "feat: add MongoDB-to-PostgreSQL data migration script"
```

---

## Task 15: End-to-end smoke test

**Files:** None (testing only)

**Step 1: Start fresh PostgreSQL**

```bash
cd backend
docker compose down -v  # fresh start
docker compose up -d db
DATABASE_URL=postgres://brainly:brainly_dev@localhost:5432/brainly npx drizzle-kit migrate
docker compose up -d
```

**Step 2: Start the backend**

```bash
cd backend && npm run dev
```

**Step 3: Test complete flow**

```bash
# 1. Signup
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"smoketest","password":"test123456"}' | jq -r '.token')

# 2. Get profile
curl -s http://localhost:3000/api/v1/me -H "Authorization: Bearer $TOKEN" | jq .

# 3. Create a tag
TAG_ID=$(curl -s -X POST http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-tag"}' | jq -r '.tag._id')

# 4. List tags
curl -s http://localhost:3000/api/v1/tags -H "Authorization: Bearer $TOKEN" | jq .

# 5. Create content with tag
curl -s -X POST http://localhost:3000/api/v1/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"link\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\",\"title\":\"Test\",\"tags\":[\"$TAG_ID\"]}" | jq .

# 6. List contents (should include tag objects)
curl -s http://localhost:3000/api/v1/content -H "Authorization: Bearer $TOKEN" | jq .

# 7. Create share link
HASH=$(curl -s -X POST http://localhost:3000/api/v1/brain/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"share":true}' | jq -r '.hash')

# 8. View shared brain (public)
curl -s http://localhost:3000/api/v1/brain/$HASH | jq .

# 9. Signin
curl -s -X POST http://localhost:3000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"smoketest","password":"test123456"}' | jq .
```

Expected: All 9 steps return valid JSON with correct data shapes.

**Step 4: Start the frontend and test UI**

```bash
cd frontend && npm run dev
```

Open browser, sign up, add content, add tags, filter, share brain. Everything should work identically.

**Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address smoke test issues in PostgreSQL migration"
```

---

## Task 16: Update documentation

**Files:**
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`

**Step 1: Update backend README**

Add sections for:
- PostgreSQL + Docker setup instructions
- Environment variables (DATABASE_URL)
- pgai setup command
- Data migration instructions (from MongoDB)
- Remove MongoDB references

**Step 2: Update CLAUDE.md**

Update references from Mongoose to Drizzle. Document:
- Schema location: `backend/src/db/schema.ts`
- Relations: `backend/src/db/relations.ts`
- Connection: `backend/src/db/index.ts`
- Migrations: `backend/drizzle/`
- AI modules: `backend/src/ai/`

**Step 3: Commit**

```bash
git add backend/README.md backend/CLAUDE.md
git commit -m "docs: update backend docs for PostgreSQL + Drizzle migration"
```

---

## Summary

| Task | What | Files | Est. Complexity |
|------|------|-------|-----------------|
| 1 | Docker Compose for PG + pgai | docker-compose.yml, .env.example | Low |
| 2 | Install Drizzle dependencies | package.json, drizzle.config.ts | Low |
| 3 | Define Drizzle schema | db/schema.ts, db/relations.ts | Medium |
| 4 | Generate & run migration | drizzle/*.sql | Low |
| 5 | Database connection module | db/index.ts | Low |
| 6 | Migrate auth routes | index.ts, middleware.ts | High |
| 7 | Migrate content routes | index.ts | High |
| 8 | Migrate tag routes | index.ts | Medium |
| 9 | Migrate sharing routes | index.ts | Medium |
| 10 | Migrate enrichment service | enrichment.service.ts | High |
| 11 | Remove Mongoose | db.ts, package.json | Low |
| 12 | pgai vectorizer setup | db/setup-pgai.ts | Medium |
| 13 | Vercel AI SDK setup | ai/shared/*.ts | Low |
| 14 | Data migration script | scripts/migrate-mongo-to-pg.ts | Medium |
| 15 | End-to-end smoke test | — | Medium |
| 16 | Update documentation | README.md, CLAUDE.md | Low |

**Total: 16 tasks.** Each has explicit steps, file paths, code, and test commands.

**After Phase 0 is production-ready**, Phase 1 (Semantic Search + Summarization + Auto-tagging) builds directly on top of the pgai vectorizer and AI SDK configured here.
