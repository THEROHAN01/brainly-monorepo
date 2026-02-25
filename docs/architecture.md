# Brainly — Architecture Deep Dive

> How the system is designed, why each decision was made, and how the pieces fit together.

---

## System Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                     │
│  URL saving form │ Content grid │ Tag manager │ Brain sharing         │
│  Phase 1+: Search bar │ Summary cards │ Chat interface               │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ JSON over HTTP
                                 │ Authorization: Bearer <jwt>
┌────────────────────────────────▼─────────────────────────────────────┐
│  EXPRESS SERVER  (src/index.ts)                                       │
│                                                                       │
│  Middleware stack:                                                     │
│    helmet → cors → express.json() → globalRateLimit                  │
│                                                                       │
│  Route groups:                                                        │
│    /api/v1/signup|signin|auth/google|me    (auth)                    │
│    /api/v1/content  (CRUD + validate + providers)                    │
│    /api/v1/tags     (CRUD)                                           │
│    /api/v1/brain    (share link + public brain view)                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  ENRICHMENT SERVICE  (src/services/enrichment.service.ts)   │     │
│  │  Runs inside the same process as a background setInterval   │     │
│  │  Poll → batch claim → extractors → save metadata            │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  AI MODULES  (src/ai/)                                       │     │
│  │  Vercel AI SDK wrapper — provider-agnostic LLM calls        │     │
│  │  Phase 1: Summarizer, SemanticSearch, AutoTagger            │     │
│  │  Phase 2: RAGChat                                           │     │
│  └─────────────────────────────────────────────────────────────┘     │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ pg.Pool
                                 │ max 20 connections
                                 │ 5s connection timeout
┌────────────────────────────────▼─────────────────────────────────────┐
│  POSTGRESQL 17  (timescaledb-ha:pg17)                                 │
│                                                                       │
│  Extensions:                                                          │
│    pgvector       — VECTOR(1536) type, <=> cosine distance           │
│    TimescaleDB    — time-series, chunk management                    │
│    ai (pgai)      — vectorizer, ai.openai_embed() SQL function       │
│                                                                       │
│  Tables: users, contents, tags, content_tags, share_links            │
│  Auto-created: contents_embedding_store (1536-dim vectors)           │
│  Trigger: contents_updated_at (manages updated_at column)            │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ reads DB queue
┌────────────────────────────────▼─────────────────────────────────────┐
│  PGAI VECTORIZER WORKER  (Docker: timescale/pgai-vectorizer-worker)  │
│                                                                       │
│  Watches for contents where full_text changed                        │
│  → chunks text (1000 chars, 200 overlap)                             │
│  → prefixes: "Title: $title\nType: $type\n\n$chunk"                 │
│  → calls OpenAI text-embedding-3-small (1536 dims)                  │
│  → stores in contents_embedding_store                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Saving a URL

```
User pastes URL in frontend
          │
          ▼
POST /api/v1/content
  { title, link, tags: [uuid, ...] }
          │
          ▼
parseUrl(link)
  → detects type (youtube/github/twitter/...)
  → extracts contentId (video ID, repo path, tweet ID)
  → generates embedUrl, canonicalUrl
          │
          ▼
INSERT into contents
  { title, link, type, contentId, userId }
  enrichmentStatus = 'pending'    ← enrichment queue entry
          │
          ▼
INSERT into content_tags (if tags provided)
  only tags owned by the requesting user are accepted
          │
          ▼
Return 201 with content + provider metadata
          │
          │ (async — within 30 seconds)
          ▼
Enrichment service polls
  DISTINCT ON (user_id) SELECT ... WHERE status='pending'
  UPDATE ... SET status='processing' WHERE id=$id AND status='pending'
  run extractor(link, contentId)
  UPDATE ... SET full_text=$text, status='enriched', meta_*=$...
          │
          │ (async — seconds to minutes)
          ▼
pgai vectorizer worker detects full_text change
  chunk full_text into 1000-char segments
  call OpenAI embeddings API
  INSERT into contents_embedding_store (id, chunk_seq, chunk, embedding)
```

---

## Data Flow: Semantic Search (Phase 1)

```
User types search query
          │
          ▼
GET /api/v1/search?q=machine+learning+transformers
          │
          ▼
SemanticSearch.search(query, userId)
          │
          ▼
Execute SQL:
  SELECT c.id, c.title, c.link, c.type, e.chunk,
         1 - (e.embedding <=> ai.openai_embed('text-embedding-3-small', $query)) AS similarity
  FROM contents_embedding_store e
  JOIN contents c ON c.id = e.id
  WHERE c.user_id = $userId
  ORDER BY similarity DESC
  LIMIT 10
          │
  ai.openai_embed() calls OpenAI API from inside PostgreSQL
  <=> computes cosine distance using pgvector
          │
          ▼
Return ranked results with similarity scores + snippets
```

No application-layer embedding call. The entire retrieval happens inside one SQL query.

---

## Enrichment Service Design

### Why In-Process (for now)

Phase 0 uses `setInterval` inside the same Node.js process for simplicity. The design deliberately uses database-level primitives (atomic claim via UPDATE WHERE) that are compatible with a future migration to BullMQ or Temporal.

### Fair Batching with `DISTINCT ON`

Standard job queues process items in FIFO order. This means a user who bulk-imports 500 links would block everyone else for hours.

The solution uses PostgreSQL's `DISTINCT ON (user_id)` to select **at most one item per user** per batch:

```sql
SELECT DISTINCT ON (user_id) ...
FROM contents
WHERE enrichment_status = 'pending'
ORDER BY user_id, created_at ASC  -- oldest item per user
LIMIT 5                           -- max 5 users per batch
```

Result: fair round-robin across users regardless of queue depth.

### Atomic Claim Pattern

```
Time 0: Batch query returns item X (status='pending')
Time 1: Enrichment service A tries to claim:
         UPDATE contents SET status='processing'
         WHERE id = X AND status = 'pending'
         → affected 1 row → A proceeds
Time 1: Enrichment service B (if multiple instances) tries same:
         UPDATE contents SET status='processing'
         WHERE id = X AND status = 'pending'
         → affected 0 rows → B skips this item
```

This is safe even with multiple Node.js instances or processes.

### Crash Recovery

On startup:

```sql
UPDATE contents SET enrichment_status = 'pending'
WHERE enrichment_status = 'processing'
```

Any items stuck in `'processing'` from a previous crash are reset. They will be re-processed in the next batch.

---

## Provider System

The URL parser (`src/providers/`) is a plugin architecture. Each provider implements:

```typescript
interface ContentProvider {
  canHandle(url: URL): boolean
  extractId(url: URL): string | null
  getEmbedUrl(contentId: string): string | null
  getCanonicalUrl(contentId: string): string
  displayName: string
  type: string
}
```

Providers are checked in priority order. The `generic` provider is the final fallback and accepts any valid HTTP/HTTPS URL.

**The same provider code runs on both frontend and backend.** The frontend uses embed URLs for iframe display. The backend uses canonical URLs + content IDs for extractor routing.

---

## Database Design Decisions

### Why UUID Primary Keys (not BIGSERIAL)

- UUIDs are generated client-side (or by `gen_random_uuid()`) — no round-trip to DB to get the ID before inserting related records
- Safer for public-facing APIs — no enumeration of sequential IDs
- Consistent with the MongoDB ObjectId convention the frontend was built around

### Why Junction Table for Tags (not Array Column)

MongoDB used an embedded array of ObjectIds in the content document. PostgreSQL offers both array columns and junction tables.

Junction table chosen because:
- Referential integrity enforced at DB level (FK cascades)
- `DELETE FROM tags WHERE id=$id` automatically cleans `content_tags` via CASCADE
- Indexed for both directions (content → tags, tag → contents)
- Standard relational pattern — Drizzle relational queries work with `with: { contentTags: { with: { tag: true } } }`

### Why `withMongoId()` Instead of Renaming the Column

The frontend was built expecting `_id` in every response (MongoDB convention). Options:
1. Rename `id` to `_id` in the schema — breaks Drizzle conventions, confusing
2. Rename in every response manually — error-prone, inconsistent
3. Thin transform function — apply once per response shape

Chose option 3. `withMongoId<T>(obj: T): T & { _id: string }` adds `_id = id` without removing `id`. Backwards compatible with the existing frontend.

### Why `updated_at` is Trigger-Managed

Drizzle does not have automatic `updatedAt` behavior like Prisma or Mongoose. Options:
1. Set `updatedAt: new Date()` in every `.set()` call — fragile, can be forgotten
2. PostgreSQL `BEFORE UPDATE` trigger — enforced at DB level, can never be bypassed

Chose option 2. The trigger `contents_updated_at` runs `NEW.updated_at = NOW()` before every update. Application code never sets this field.

---

## Authentication Design

### JWT vs Sessions

JWT (stateless) chosen over server-side sessions because:
- No Redis or session store needed
- Naturally fits a future mobile app or third-party API client
- 7-day expiry is acceptable for a personal tool

Trade-off: No instant token revocation. If a token is compromised, it's valid until expiry.

### Race Condition: Signup

Old (check-then-insert):
```typescript
const existing = await db.select()...where(username)
if (existing) return 409
await db.insert(users).values({ username })  // ← race window here
```

Two concurrent requests can both pass the check and both try to insert → one gets a `23505` DB error that surfaces as a 500.

New (insert-catch):
```typescript
try {
    await db.insert(users).values({ username })
    return 201
} catch (e) {
    if (e.code === '23505') return 409   // deterministic, no race window
}
```

The same pattern applies to: tag creation, share link creation, Google OAuth signup.

---

## AI Architecture — Modularity Principle

Every AI module is designed to be **portable** — zero Brainly-specific dependencies.

```typescript
// Bad — tightly coupled
class Summarizer {
    async summarize(contentId: string) {
        const content = await db.query.contents.findFirst(...)  // ← Brainly DB
        const model = getDefaultModel()                          // ← Brainly config
        ...
    }
}

// Good — portable, dependency-injected
class Summarizer {
    constructor(private model: LanguageModel) {}
    async summarize(text: string, context?: string): Promise<Summary> {
        // No Brainly dependencies. Works anywhere.
    }
}

// Brainly-specific wiring happens in the route handler:
const summarizer = new Summarizer(getDefaultModel());
const content = await db.query.contents.findFirst(...);
const summary = await summarizer.summarize(content.fullText, content.title);
```

This means:
- The `Summarizer` module can be published as an npm package
- Integration tests can run without a database
- Swapping the model only requires changing the constructor argument

---

## Security Model

### Defense in Depth

```
Request arrives
    │
    ▼
Helmet — sets 11 security headers (XSS, HSTS, no-sniff, etc.)
    │
    ▼
CORS — only allows requests from CORS_ORIGIN
    │
    ▼
Global rate limiter — 100 req / 15 min per IP
    │
    ▼
Route-specific rate limiter — 10 req / 15 min for auth
    │
    ▼
Zod validation — rejects malformed input before touching DB
    │
    ▼
userMiddleware — verifies JWT, sets req.userId
    │
    ▼
Database query — always filters by AND user_id = req.userId
    │
    ▼
PostgreSQL parameterized queries — prevent SQL injection
```

No single layer is the entire security model. Each layer independently reduces attack surface.

### Cross-User Data Isolation

Every query that touches user data includes:

```typescript
.where(and(
    eq(schema.contents.id, contentId),
    eq(schema.contents.userId, req.userId)   // ← enforced on every operation
))
```

This means even if a user guesses another user's content UUID, they cannot read, modify, or delete it. The `userId` check at the DB layer is the authoritative boundary.
