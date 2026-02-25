import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { eq, and, or, inArray } from 'drizzle-orm';
import { db, pool, schema } from './db/index';
import { withMongoId } from './db/transforms';
import { userMiddleware } from './middleware';
import { parseUrl, getProviderInfo } from './providers';
import { startEnrichmentService, stopEnrichmentService } from './services/enrichment.service';
import { logger } from './logger';

// Validation schemas
const signupSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .max(100, "Password must be at most 100 characters")
});

const signinSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not set");
    process.exit(1);
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
    console.warn("WARNING: GOOGLE_CLIENT_ID not set - Google OAuth will be disabled");
}
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again after 15 minutes." },
});
const contentCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many content submissions, please try again later." },
});

app.use(globalLimiter);

const PORT = process.env.PORT || 5000;

// ========== AUTH ENDPOINTS ==========

app.post("/api/v1/signup", authLimiter, async (req: Request, res: Response) => {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { username, password } = result.data;

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await db.insert(schema.users).values({ username, password: hashedPassword });
        res.status(201).json({ message: "Account created successfully" });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: "Username already exists" });
        }
        res.status(500).json({ message: "Failed to create account" });
    }
});

app.post("/api/v1/signin", authLimiter, async (req: Request, res: Response) => {
    const result = signinSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }
    const { username, password } = result.data;

    const [existingUser] = await db.select().from(schema.users)
        .where(eq(schema.users.username, username)).limit(1);
    if (!existingUser) {
        return res.status(400).json({ message: "Invalid credentials" });
    }
    if (!existingUser.password) {
        return res.status(400).json({ message: "This account uses Google sign-in. Please use Google to log in." });
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (isMatch) {
        const token = jwt.sign({ id: existingUser.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } else {
        res.status(403).json({ message: "Incorrect Credentials" });
    }
});

app.post("/api/v1/auth/google", authLimiter, async (req: Request, res: Response) => {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
        return res.status(503).json({ message: "Google authentication is not configured" });
    }
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
    }
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload) return res.status(401).json({ message: "Invalid Google token" });

        const { sub: googleId, email, picture } = payload;

        let [user] = await db.select().from(schema.users)
            .where(or(eq(schema.users.googleId, googleId), eq(schema.users.email, email ?? '')))
            .limit(1);

        if (!user) {
            try {
                const [newUser] = await db.insert(schema.users).values({
                    googleId, email,
                    username: email?.split('@')[0] || `user_${googleId?.slice(0, 8)}`,
                    profilePicture: picture,
                    authProvider: 'google'
                }).returning();
                user = newUser;
            } catch (insertError: any) {
                if (insertError.code === '23505') {
                    // Race condition: another request created the user — re-fetch
                    const [existing] = await db.select().from(schema.users)
                        .where(or(eq(schema.users.googleId, googleId), eq(schema.users.email, email ?? '')))
                        .limit(1);
                    if (!existing) return res.status(500).json({ message: "Account creation conflict" });
                    user = existing;
                } else {
                    throw insertError;
                }
            }
        } else if (!user.googleId) {
            const [updated] = await db.update(schema.users)
                .set({ googleId, profilePicture: picture, authProvider: 'google' })
                .where(eq(schema.users.id, user.id)).returning();
            user = updated;
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } catch (error: any) {
        res.status(401).json({ message: "Google authentication failed", detail: error?.message || "Unknown error" });
    }
});

app.get("/api/v1/me", userMiddleware, async (req: Request, res: Response) => {
    try {
        const [user] = await db.select({
            id: schema.users.id,
            username: schema.users.username,
            email: schema.users.email,
            profilePicture: schema.users.profilePicture,
            authProvider: schema.users.authProvider,
        }).from(schema.users).where(eq(schema.users.id, req.userId)).limit(1);

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user });
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching user profile" });
    }
});

// ========== CONTENT ENDPOINTS ==========

app.post("/api/v1/content", contentCreationLimiter, userMiddleware, async (req: Request, res: Response) => {
    const { title, link, tags } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0)
        return res.status(400).json({ message: "Title is required" });
    if (!link || typeof link !== 'string')
        return res.status(400).json({ message: "Link is required" });
    if (title.length > 500)
        return res.status(400).json({ message: "Title must be 500 characters or less" });

    const parsed = parseUrl(link);
    if (!parsed)
        return res.status(400).json({ message: "Invalid URL format. Please provide a valid HTTP or HTTPS URL." });

    try {
        const userId = req.userId;

        let validTags: (typeof schema.tags.$inferSelect)[] = [];
        if (tags && Array.isArray(tags) && tags.length > 0) {
            validTags = await db.select().from(schema.tags)
                .where(and(inArray(schema.tags.id, tags), eq(schema.tags.userId, userId)));
        }

        const [content] = await db.insert(schema.contents).values({
            title: title.trim(),
            link: parsed.originalUrl,
            contentId: parsed.contentId ?? null,
            type: parsed.type,
            userId,
        }).returning();

        if (validTags.length > 0) {
            await db.insert(schema.contentTags).values(
                validTags.map(t => ({ contentId: content.id, tagId: t.id }))
            );
        }

        return res.status(201).json({
            message: "Content created successfully",
            content: {
                ...withMongoId(content),
                tags: validTags.map(withMongoId),
                displayName: parsed.displayName,
                embedUrl: parsed.embedUrl,
                canonicalUrl: parsed.canonicalUrl,
                canEmbed: parsed.canEmbed
            }
        });
    } catch (error: any) {
        return res.status(500).json({ message: "Failed to create content" });
    }
});

app.post("/api/v1/content/validate", userMiddleware, async (req: Request, res: Response) => {
    const { link } = req.body;
    if (!link || typeof link !== 'string')
        return res.status(400).json({ valid: false, message: "URL is required" });

    const parsed = parseUrl(link);
    if (!parsed)
        return res.status(400).json({ valid: false, message: "Invalid URL format. Please provide a valid HTTP or HTTPS URL." });

    return res.json({
        valid: true,
        type: parsed.type,
        displayName: parsed.displayName,
        contentId: parsed.contentId,
        embedUrl: parsed.embedUrl,
        canonicalUrl: parsed.canonicalUrl,
        canEmbed: parsed.canEmbed,
        embedType: parsed.embedType
    });
});

app.get("/api/v1/content/providers", (_req: Request, res: Response) => {
    res.json({ providers: getProviderInfo() });
});

app.get("/api/v1/content", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const userContents = await db.query.contents.findMany({
            where: eq(schema.contents.userId, userId),
            with: { contentTags: { with: { tag: true } } },
            orderBy: schema.contents.createdAt,
        });

        res.json({
            content: userContents.map(c => ({
                _id: c.id,
                title: c.title,
                link: c.link,
                type: c.type,
                contentId: c.contentId,
                userId: c.userId,
                createdAt: c.createdAt,
                tags: c.contentTags.map(ct => ({ _id: ct.tag.id, name: ct.tag.name })),
            }))
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch content" });
    }
});

app.delete("/api/v1/content", userMiddleware, async (req: Request, res: Response) => {
    const contentId = req.body.contentId;
    if (!contentId) return res.status(400).json({ message: "Content ID is required" });

    try {
        const [deleted] = await db.delete(schema.contents)
            .where(and(eq(schema.contents.id, contentId), eq(schema.contents.userId, req.userId)))
            .returning();
        if (!deleted) return res.status(404).json({ message: "Content not found" });
        res.json({ message: "Content deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: "Invalid contentId format" });
    }
});

// ========== TAG ENDPOINTS ==========

app.get("/api/v1/tags", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userTags = await db.select().from(schema.tags)
            .where(eq(schema.tags.userId, req.userId)).orderBy(schema.tags.name);
        res.json({ tags: userTags.map(withMongoId) });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch tags" });
    }
});

app.post("/api/v1/tags", userMiddleware, async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string')
        return res.status(400).json({ message: "Tag name is required" });

    const trimmedName = name.trim().toLowerCase();
    if (trimmedName.length === 0 || trimmedName.length > 50)
        return res.status(400).json({ message: "Tag name must be 1-50 characters" });

    try {
        const [existingTag] = await db.select().from(schema.tags)
            .where(and(eq(schema.tags.name, trimmedName), eq(schema.tags.userId, req.userId))).limit(1);

        if (existingTag)
            return res.status(409).json({ message: "Tag already exists", tag: withMongoId(existingTag) });

        const [tag] = await db.insert(schema.tags)
            .values({ name: trimmedName, userId: req.userId }).returning();
        res.status(201).json({ message: "Tag created successfully", tag: withMongoId(tag) });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create tag" });
    }
});

app.delete("/api/v1/tags/:tagId", userMiddleware, async (req: Request, res: Response) => {
    const { tagId } = req.params;
    try {
        const [deleted] = await db.delete(schema.tags)
            .where(and(eq(schema.tags.id, tagId), eq(schema.tags.userId, req.userId))).returning();
        if (!deleted) return res.status(404).json({ message: "Tag not found" });
        res.json({ message: "Tag deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete tag" });
    }
});

app.put("/api/v1/content/:contentId/tags", userMiddleware, async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ message: "Tags must be an array" });

    try {
        const [content] = await db.select().from(schema.contents)
            .where(and(eq(schema.contents.id, contentId), eq(schema.contents.userId, req.userId))).limit(1);
        if (!content) return res.status(404).json({ message: "Content not found" });

        let validTags: (typeof schema.tags.$inferSelect)[] = [];
        if (tags.length > 0) {
            validTags = await db.select().from(schema.tags)
                .where(and(inArray(schema.tags.id, tags), eq(schema.tags.userId, req.userId)));
        }

        await db.delete(schema.contentTags).where(eq(schema.contentTags.contentId, contentId));
        if (validTags.length > 0) {
            await db.insert(schema.contentTags).values(
                validTags.map(t => ({ contentId, tagId: t.id }))
            );
        }
        res.json({ message: "Tags updated successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update tags" });
    }
});

// ========== BRAIN SHARING ENDPOINTS ==========

app.post("/api/v1/brain/share", userMiddleware, async (req: Request, res: Response) => {
    try {
        const share = req.body.share;
        if (share) {
            const [existingLink] = await db.select().from(schema.shareLinks)
                .where(eq(schema.shareLinks.userId, req.userId)).limit(1);
            if (existingLink) return res.json({ hash: existingLink.hash });

            const hash = crypto.randomBytes(5).toString('hex');
            await db.insert(schema.shareLinks).values({ hash, userId: req.userId });
            return res.json({ hash });
        } else {
            await db.delete(schema.shareLinks).where(eq(schema.shareLinks.userId, req.userId));
            return res.json({ message: "removed link" });
        }
    } catch (error: any) {
        res.status(500).json({ message: "Failed to manage share link" });
    }
});

app.get("/api/v1/brain/:shareLink", async (req: Request, res: Response) => {
    try {
        const hash = req.params.shareLink;
        const [link] = await db.select().from(schema.shareLinks)
            .where(eq(schema.shareLinks.hash, hash)).limit(1);
        if (!link) return res.status(411).json({ message: "incorrect input" });

        const sharedContent = await db.select({
            id: schema.contents.id,
            title: schema.contents.title,
            link: schema.contents.link,
            type: schema.contents.type,
            contentId: schema.contents.contentId,
        }).from(schema.contents)
            .where(eq(schema.contents.userId, link.userId))
            .orderBy(schema.contents.createdAt);

        const [user] = await db.select({ username: schema.users.username })
            .from(schema.users).where(eq(schema.users.id, link.userId)).limit(1);
        if (!user) return res.status(411).json({ message: "user not found, error should ideally not happen" });

        res.json({
            username: user.username,
            content: sharedContent.map(c => withMongoId(c)),
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch shared brain" });
    }
});

// ========== SERVER BOOT ==========

async function main() {
    if (!process.env.DATABASE_URL) {
        logger.fatal('FATAL: DATABASE_URL environment variable is not set');
        process.exit(1);
    }

    const server = app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Server running');
    });

    await startEnrichmentService();

    const shutdown = async () => {
        logger.info('Shutdown signal received, closing gracefully');
        stopEnrichmentService();
        server.close();
        await pool.end();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch((err) => {
    logger.fatal({ err }, 'Fatal startup error');
    process.exit(1);
});
