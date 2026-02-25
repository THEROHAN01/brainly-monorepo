# Brainly — System Documentation

> **Personal knowledge management with AI intelligence.**
> Save URLs from anywhere, get automatic metadata extraction, semantic search, and AI-powered insights from your saved knowledge.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Content Enrichment Pipeline](#6-content-enrichment-pipeline)
7. [Vector Embeddings & Semantic Search](#7-vector-embeddings--semantic-search)
8. [AI Module System](#8-ai-module-system)
9. [Authentication](#9-authentication)
10. [Local Development Setup](#10-local-development-setup)
11. [Configuration Reference](#11-configuration-reference)
12. [Production Readiness Assessment](#12-production-readiness-assessment)
13. [Roadmap](#13-roadmap)

---

## 1. Project Overview

Brainly is a second-brain application. The core loop:

1. **Save** — Paste a URL (YouTube, GitHub, Twitter/X, Medium, Instagram, Notion, or any web article)
2. **Enrich** — Background service automatically extracts transcripts, READMEs, article text, author info, thumbnails
3. **Organize** — Tag content, search it, share your brain publicly
4. **AI (Phase 1+)** — Semantic search, auto-summarization, auto-tagging, RAG chat with your knowledge base

### Repository Structure

```
brainly-monorepo/
├── backend/                  # Express + TypeScript backend (this codebase)
├── frontend/                 # React frontend (separate)
└── docs/                     # All documentation (you are here)
    ├── README.md             # This file — system overview
    ├── api-reference.md      # Detailed API endpoint docs
    ├── database-schema.md    # Schema, indexes, constraints
    ├── architecture.md       # System design, data flows, decisions
    ├── production-guide.md   # Production readiness + scaling gaps
    ├── engineering_wiki/     # Deep-dive technical articles
    └── plans/                # Implementation plans (historical)
```

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js + TypeScript | TS 5.8 | Type-safe backend |
| Web framework | Express | 4.x | HTTP server + routing |
| Database | PostgreSQL 17 | timescaledb-ha image | Primary datastore |
| ORM | Drizzle ORM | 0.45 | Type-safe queries + migrations |
| Vector/AI layer | pgai (Timescale) | latest | Declarative embedding sync |
| Vector storage | pgvector | (built into timescaledb-ha) | Vector type + similarity ops |
| LLM abstraction | Vercel AI SDK | 6.x | Provider-agnostic LLM calls |
| LLM providers | OpenAI / Anthropic | — | Swap via env var |
| Embedding model | text-embedding-3-small | OpenAI | 1536-dim content embeddings |
| Auth | JWT + bcrypt + Google OAuth | — | 7-day tokens, bcrypt cost 10 |
| Security | Helmet + express-rate-limit + Zod | — | Headers, rate limits, validation |
| Logging | Pino | 10.x | Structured JSON logs |
| Containerization | Docker Compose | — | Local dev infrastructure |

---

## 3. Architecture

### High-Level System

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                           │
│   Save URLs │ Browse content │ Tag │ Search │ Share │ Chat (P2)  │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP (JSON)
┌─────────────────────────▼────────────────────────────────────────┐
│                   Express HTTP Server                             │
│   Auth routes │ Content routes │ Tag routes │ Brain sharing       │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │                Enrichment Service                        │    │
│   │   setInterval(30s) → DISTINCT ON (user_id) batch        │    │
│   │   → atomic claim → extractor → save metadata            │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │              Vercel AI SDK (Phase 1+)                    │    │
│   │   LLM_PROVIDER=openai → GPT-4o-mini (default)           │    │
│   │   LLM_PROVIDER=anthropic → Claude Sonnet (default)      │    │
│   └─────────────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────────────┘
                          │ pg.Pool (max 20 connections)
┌─────────────────────────▼────────────────────────────────────────┐
│              PostgreSQL 17 (timescaledb-ha)                       │
│                                                                   │
│   users │ contents │ tags │ content_tags │ share_links           │
│                                                                   │
│   contents_embedding_store  ← auto-created by pgai               │
│   (VECTOR(1536) per chunk)                                        │
└─────────────────────────┬────────────────────────────────────────┘
                          │ polls DB queue
┌─────────────────────────▼────────────────────────────────────────┐
│           pgai Vectorizer Worker (Docker service)                 │
│   Detects full_text changes → chunks → OpenAI embed → stores     │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single database | PostgreSQL + pgvector | Vectors live next to relational data — no sync layer needed |
| ORM | Drizzle (not Prisma) | Allows raw SQL for `DISTINCT ON`, pgai functions; TypeScript-first |
| Embedding management | pgai vectorizer worker | Zero app code for embeddings — declarative, automatic sync |
| LLM abstraction | Vercel AI SDK | Single interface for OpenAI/Anthropic/Gemini/Ollama |
| Enrichment architecture | In-process polling (Phase 0) | Simple for MVP; upgradeable to BullMQ+Redis when scaling |
| Frontend compat | `withMongoId()` transform | Returns `_id` (MongoDB convention) without touching frontend code |
| Race condition handling | insert-then-catch-23505 | Eliminates TOCTOU window on signup, tag creation, share links |

---

## 4. Database Schema

### Tables Overview

```
users (auth identity)
  └──< contents (saved URLs, one-to-many)
  └──< tags (user-defined labels, one-to-many)
  └──< share_links (max one per user)

contents >──< tags  (via content_tags junction table)

contents_embedding_store  ← auto-created by pgai
  └── FK → contents.id CASCADE
```

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `username` | `varchar(50)` | UNIQUE, nullable | Null for Google-only accounts |
| `email` | `varchar(255)` | UNIQUE, nullable | Set for Google OAuth accounts |
| `password` | `text` | nullable | bcrypt hash; null for Google accounts |
| `google_id` | `text` | UNIQUE, nullable | Google subject ID |
| `profile_picture` | `text` | nullable | URL from Google OAuth |
| `auth_provider` | `varchar(20)` | NOT NULL, default `'local'` | `'local'` or `'google'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `tags`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK | |
| `name` | `varchar(100)` | NOT NULL | Stored lowercase, trimmed |
| `user_id` | `uuid` | NOT NULL, FK → users.id CASCADE | |
| `created_at` | `timestamptz` | NOT NULL | |

**Indexes:** `UNIQUE(name, user_id)` — same tag name can exist for different users.

### `contents`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `title` | `varchar(500)` NOT NULL | User-provided title |
| `link` | `text` NOT NULL | Original URL |
| `content_id` | `text` | Platform-specific ID (YouTube video ID, etc.) |
| `type` | `varchar(30)` | `youtube`, `github`, `twitter`, `medium`, `instagram`, `notion`, `generic` |
| `user_id` | `uuid` FK → users CASCADE | |
| `enrichment_status` | `varchar(20)` | `pending` → `processing` → `enriched` / `failed` / `skipped` |
| `enrichment_error` | `text` | Last error message if failed |
| `enrichment_retries` | `integer` default 0 | Max 3 retries |
| `enriched_at` | `timestamptz` | When enrichment completed |
| `meta_title` | `text` | Extracted page/video title |
| `meta_description` | `text` | Extracted description |
| `meta_author` | `text` | Author name |
| `meta_author_url` | `text` | Author profile URL |
| `meta_thumbnail` | `text` | Thumbnail image URL |
| `meta_published_at` | `timestamptz` | Original publish date |
| `meta_tags` | `jsonb` | `string[]` — provider-extracted tags |
| `meta_language` | `varchar(10)` | `en`, `es`, etc. |
| `full_text` | `text` | **Embedding source** — article body, video transcript, README |
| `full_text_type` | `varchar(20)` | `transcript`, `article`, `readme`, etc. |
| `transcript_segments` | `jsonb` | `[{text, start, duration}]` for YouTube |
| `provider_data` | `jsonb` | Raw provider-specific data |
| `extracted_at` | `timestamptz` | When extraction ran |
| `extractor_version` | `varchar(20)` | Extractor version for cache invalidation |
| `summary` | `text` | **AI field (Phase 1)** — LLM-generated summary |
| `ai_tags` | `jsonb` | **AI field (Phase 1)** — LLM-suggested tags |
| `created_at` | `timestamptz` NOT NULL | |
| `updated_at` | `timestamptz` NOT NULL | Managed by PostgreSQL trigger — never set manually |

**Indexes:**
- `idx_contents_user_created` on `(user_id, created_at)` — feeds `GET /content`
- `idx_contents_enrichment` on `(enrichment_status, created_at)` — feeds enrichment batch query

**Trigger:** `contents_updated_at` — `BEFORE UPDATE`, sets `updated_at = NOW()` automatically.

### `content_tags` (junction)

| Column | Type | Notes |
|--------|------|-------|
| `content_id` | `uuid` | FK → contents.id CASCADE |
| `tag_id` | `uuid` | FK → tags.id CASCADE |

**Primary key:** `(content_id, tag_id)` — prevents duplicate tag assignments.

### `share_links`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `hash` | `varchar(20)` | UNIQUE — 10 random hex chars |
| `user_id` | `uuid` | UNIQUE, FK → users.id CASCADE — **one link per user** |

### `contents_embedding_store` (auto-created by pgai)

> This table is never defined by application code. pgai creates it when `setup:pgai` runs.

| Column | Type | Notes |
|--------|------|-------|
| `embedding_uuid` | `uuid` PK | |
| `id` | `uuid` | FK → contents.id CASCADE — source row |
| `chunk_seq` | `integer` | 0, 1, 2… for each chunk of `full_text` |
| `chunk` | `text` | The formatted text chunk that was embedded |
| `embedding` | `vector(1536)` | OpenAI text-embedding-3-small output |

---

## 5. API Reference

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

#### `POST /api/v1/signup`
Rate limited: 10 req / 15 min.

**Request:**
```json
{ "username": "johndoe", "password": "secret123" }
```
- `username`: 3–30 chars, `[a-zA-Z0-9_]` only
- `password`: 6–100 chars

**Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 201 | `{ "message": "Account created successfully" }` | Success |
| 400 | `{ "message": "<validation error>" }` | Invalid input |
| 409 | `{ "message": "Username already exists" }` | Duplicate username |

---

#### `POST /api/v1/signin`
Rate limited: 10 req / 15 min.

**Request:**
```json
{ "username": "johndoe", "password": "secret123" }
```

**Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ "token": "<jwt>" }` | Success — 7-day JWT |
| 400 | `{ "message": "Invalid credentials" }` | User not found |
| 400 | `{ "message": "This account uses Google sign-in..." }` | Google-only account |
| 403 | `{ "message": "Incorrect Credentials" }` | Wrong password |

---

#### `POST /api/v1/auth/google`
Rate limited: 10 req / 15 min.

**Request:**
```json
{ "credential": "<google_id_token>" }
```

**Behavior:**
- Verifies Google ID token
- If user exists by `google_id` or `email` → return JWT
- If new user → insert (race-safe with 23505 catch + re-fetch) → return JWT
- If existing local account with same email → links Google ID to account

**Responses:**
| Status | Body |
|--------|------|
| 200 | `{ "token": "<jwt>" }` |
| 400 | `{ "message": "Google credential is required" }` |
| 401 | `{ "message": "Google authentication failed" }` |
| 503 | `{ "message": "Google authentication is not configured" }` |

---

#### `GET /api/v1/me` 🔒
**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "profilePicture": "https://...",
    "authProvider": "local"
  }
}
```

---

### Content Endpoints

#### `POST /api/v1/content` 🔒
Rate limited: 30 req / 15 min.

**Request:**
```json
{
  "title": "Great YouTube video",
  "link": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "tags": ["uuid-tag-1", "uuid-tag-2"]
}
```

**Behavior:**
- Validates URL format and detects provider type
- Inserts content row with `enrichmentStatus='pending'`
- Assigns tags (only tags owned by user are accepted)
- Enrichment service picks it up within 30 seconds

**Response (201):**
```json
{
  "message": "Content created successfully",
  "content": {
    "_id": "uuid",
    "title": "Great YouTube video",
    "link": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "type": "youtube",
    "contentId": "dQw4w9WgXcQ",
    "tags": [{ "_id": "uuid", "name": "music" }],
    "displayName": "YouTube",
    "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "canonicalUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "canEmbed": true
  }
}
```

---

#### `GET /api/v1/content` 🔒
Returns all content for the authenticated user, with populated tags.

**Response:**
```json
{
  "content": [
    {
      "_id": "uuid",
      "title": "Great YouTube video",
      "link": "https://...",
      "type": "youtube",
      "contentId": "dQw4w9WgXcQ",
      "userId": "uuid",
      "createdAt": "2026-02-25T10:00:00Z",
      "tags": [{ "_id": "uuid", "name": "music" }]
    }
  ]
}
```

---

#### `DELETE /api/v1/content` 🔒
**Request:**
```json
{ "contentId": "uuid" }
```
Deletes content + all `content_tags` rows (cascade). Only deletes if owned by user.

---

#### `POST /api/v1/content/validate` 🔒
**Request:** `{ "link": "https://github.com/user/repo" }`

**Response:**
```json
{
  "valid": true,
  "type": "github",
  "displayName": "GitHub",
  "contentId": "user/repo",
  "embedUrl": null,
  "canonicalUrl": "https://github.com/user/repo",
  "canEmbed": false,
  "embedType": null
}
```

---

#### `GET /api/v1/content/providers`
No auth required.

Returns list of supported providers with metadata (name, icon, supported embed types).

---

#### `PUT /api/v1/content/:contentId/tags` 🔒
**Request:** `{ "tags": ["uuid-tag-1", "uuid-tag-2"] }`

Replaces all tags on the content item. Runs as a **database transaction** (atomic delete + insert). Tags not owned by the user are silently ignored.

---

### Tag Endpoints

#### `GET /api/v1/tags` 🔒
Returns all tags for the authenticated user, ordered alphabetically.

```json
{ "tags": [{ "_id": "uuid", "name": "ai", "userId": "uuid", "createdAt": "..." }] }
```

---

#### `POST /api/v1/tags` 🔒
**Request:** `{ "name": "machine learning" }`

- Name is trimmed and lowercased before storage
- Max 50 characters
- Duplicate names return 409 (race-safe via insert-catch-23505)

**Responses:**
| Status | Body |
|--------|------|
| 201 | `{ "message": "Tag created successfully", "tag": { "_id": "...", "name": "machine learning" } }` |
| 409 | `{ "message": "Tag already exists", "tag": { ... } }` |

---

#### `DELETE /api/v1/tags/:tagId` 🔒
Deletes tag and automatically removes all `content_tags` associations (FK cascade).

---

### Brain Sharing Endpoints

#### `POST /api/v1/brain/share` 🔒
**Enable sharing:** `{ "share": true }` → Returns `{ "hash": "a1b2c3d4e5" }`

**Disable sharing:** `{ "share": false }` → Returns `{ "message": "removed link" }`

One share link per user maximum. Idempotent — calling with `share: true` twice returns the same hash.

---

#### `GET /api/v1/brain/:shareLink`
No auth required — public endpoint.

**Response:**
```json
{
  "username": "johndoe",
  "content": [
    { "_id": "uuid", "title": "...", "link": "...", "type": "youtube", "contentId": "..." }
  ]
}
```

---

## 6. Content Enrichment Pipeline

The enrichment service runs as a background loop inside the main Node.js process. It polls for pending content and runs the appropriate extractor.

### Lifecycle States

```
 [saved by user]
       │
       ▼
   pending  ←──────────────────────────────┐
       │                                    │ (retry, retries < maxRetries)
       ▼                                    │
  processing  ──── extractor fails ────────►│
       │                                    │
       ├─── extractor succeeds ──────► enriched
       │
       ├─── no extractor for type ──► skipped
       │
       └─── retries exhausted ──────► failed
```

### Batch Selection — Per-User Fairness

The enrichment batch query uses `DISTINCT ON (user_id)` to ensure fairness across users. A single user with 1000 saved links cannot monopolize the queue:

```sql
SELECT DISTINCT ON (user_id)
    id, type, link, content_id, title, user_id, enrichment_retries, created_at
FROM contents
WHERE enrichment_status = 'pending'
  AND (
    enrichment_retries = 0
    OR (
        enrichment_retries > 0
        AND enrichment_retries < 3
        AND updated_at < NOW() - INTERVAL '60 seconds'
    )
  )
ORDER BY user_id, created_at ASC
LIMIT 5
```

**Result:** At most 1 item per user, up to 5 users per batch, processed with concurrency of 3.

### Atomic Claim — Prevents Duplicate Processing

```sql
UPDATE contents
SET enrichment_status = 'processing'
WHERE id = $1 AND enrichment_status = 'pending'
RETURNING *
```

If this returns no row, another process already claimed it. The current process skips it silently.

### Extractors

| Type | Extractor | API Used | What it extracts |
|------|-----------|---------|-----------------|
| `youtube` | `youtube.extractor.ts` | YouTube Innertube (no key req'd) | Title, description, chapters, full transcript, author, publish date |
| `github` | `github.extractor.ts` | GitHub REST API (`GITHUB_TOKEN`) | README full text, description, topics, stars, language |
| `twitter` | `twitter.extractor.ts` | Twitter oEmbed (`TWITTER_BEARER_TOKEN`) | Tweet text, author |
| `medium` | `medium.extractor.ts` | HTML scrape | Article full text, author, tags |
| `instagram` | `instagram.extractor.ts` | Instagram Basic Display (`INSTAGRAM_APP_ID`) | Caption |
| `generic` | `generic.extractor.ts` | @extractus/article-extractor | Article text from any URL |

All extractors degrade gracefully — missing API keys cause `enrichmentStatus='skipped'`.

### Crash Recovery

On startup, the enrichment service resets all rows stuck in `'processing'` back to `'pending'`. This handles the case where the server crashed mid-enrichment.

---

## 7. Vector Embeddings & Semantic Search

### Storage Architecture

Vectors are stored **inside PostgreSQL**, not in a separate vector database. pgvector (bundled in `timescaledb-ha:pg17`) provides the `VECTOR` type and similarity operators.

```
PostgreSQL
├── contents                     ← your saved content
└── contents_embedding_store     ← AUTO-CREATED by pgai
    ├── id (FK → contents.id)
    ├── chunk_seq (0, 1, 2…)
    ├── chunk (text segment, with title/type prefix)
    └── embedding VECTOR(1536)   ← OpenAI text-embedding-3-small
```

### Embedding Configuration

| Setting | Value |
|---------|-------|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Chunk size | 1000 characters |
| Chunk overlap | 200 characters |
| Format | `"Title: {title}\nType: {type}\n\n{chunk}"` |
| Trigger | Automatic on `full_text` insert/update |

### How Embeddings Are Generated

The `pgai-vectorizer-worker` Docker service watches a PostgreSQL queue. When `full_text` is populated by the enrichment service, the worker:

1. Reads the new/updated `full_text`
2. Splits it into chunks (1000 chars, 200 overlap)
3. Prefixes each chunk with title + type metadata
4. Calls `OpenAI /embeddings` API
5. Stores 1536-dim vectors in `contents_embedding_store`

**No application code is involved in this process.**

### Semantic Search Query (Phase 1 implementation)

```sql
-- Find content semantically similar to the user's query
SELECT
    c.id,
    c.title,
    c.link,
    c.type,
    e.chunk,
    1 - (e.embedding <=> ai.openai_embed('text-embedding-3-small', $query)) AS similarity
FROM contents_embedding_store e
JOIN contents c ON c.id = e.id
WHERE c.user_id = $userId
ORDER BY similarity DESC
LIMIT 10;
```

The `<=>` operator is cosine distance (from pgvector). `ai.openai_embed()` is an SQL function that calls OpenAI from inside PostgreSQL — no application-layer embedding call needed.

---

## 8. AI Module System

All AI modules live in `backend/src/ai/` and follow a portable, dependency-injected design pattern. Each module can be dropped into any Node.js codebase.

### LLM Client

`src/ai/shared/llm-client.ts` wraps the Vercel AI SDK:

```typescript
import { getDefaultModel, getModel } from './ai/shared/llm-client';

const model = getDefaultModel();          // reads LLM_PROVIDER env var
const model = getModel('anthropic');      // explicit provider
const model = getModel('openai', 'gpt-4o'); // explicit model
```

| `LLM_PROVIDER` | Default model |
|----------------|--------------|
| `openai` | `gpt-4o-mini` |
| `anthropic` | `claude-sonnet-4-6-20250514` |

Providers are lazily initialized — only created on first use. Missing API keys throw on first call, not at startup.

### Module Directory (Current + Planned)

```
src/ai/
├── shared/
│   ├── llm-client.ts     ✅ Built — provider-agnostic LLM wrapper
│   └── types.ts          ✅ Built — shared interfaces
├── summarizer/           🔲 Phase 1 — auto-summarize on enrichment
├── search/               🔲 Phase 1 — semantic search via pgai
├── tagger/               🔲 Phase 1 — auto-tag suggestions
└── rag/                  🔲 Phase 2 — chat with your brain
```

### Shared Types (`src/ai/shared/types.ts`)

```typescript
interface Summary        { text: string; style: 'brief'|'detailed'|'bullet-points'; modelUsed: string; }
interface SearchResult   { contentId, title, link, type, relevance, snippet }
interface TagSuggestion  { tag: string; confidence: number; }
interface ChatMessage    { role: 'user'|'assistant'; content: string; }
interface ChatSource     { contentId, title, link, relevance }
interface ChatResponse   { text: string; sources: ChatSource[]; }
```

---

## 9. Authentication

### JWT Flow

```
POST /api/v1/signup or /signin
          │
          ▼
    jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' })
          │
          ▼
    Client stores token

Protected request:
    Authorization: Bearer <token>
          │
          ▼
    userMiddleware: jwt.verify(token, JWT_SECRET)
          │
          ▼
    req.userId = decoded.id   (string, non-optional)
          │
          ▼
    Every DB query filters by userId
```

### Google OAuth Flow

```
Frontend (Google One Tap / OAuth popup)
    → receives Google ID token
    → POST /api/v1/auth/google { credential: "<id_token>" }

Backend:
    1. googleClient.verifyIdToken(credential)
    2. Extract { sub: googleId, email, picture }
    3. SELECT user WHERE google_id = $googleId OR email = $email
    4a. User found → return JWT
    4b. No user → INSERT (catch 23505 race → re-fetch) → return JWT
    4c. User found but no googleId → link Google to existing account
```

### Security Details

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt, cost factor 10 |
| Duplicate username | `INSERT` then catch error code `23505` (no TOCTOU window) |
| Cross-user data | Every query has `AND user_id = $userId` from JWT |
| Rate limiting | Auth: 10/15min, Content creation: 30/15min, Global: 100/15min |
| Request headers | Helmet (XSS, HSTS, no-sniff, etc.) |
| Body parsing | No size limit currently (1mb limit recommended for production) |
| SQL injection | Drizzle parameterized queries; raw SQL uses `sql` template tag |

---

## 10. Local Development Setup

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- npm

### Step-by-Step

```bash
# 1. Clone and install
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set:
#   JWT_SECRET=any-long-random-string
#   OPENAI_API_KEY=sk-...   (for embeddings + AI features)

# 3. Start PostgreSQL + pgai worker
docker compose up -d

# 4. Apply database schema
npm run db:migrate

# 5. Set up pgai vectorizer (run once — idempotent)
npm run setup:pgai

# 6. Start development server
npm run dev
```

### Available Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Build TypeScript + start server (watch mode) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled server (production) |
| `npm run db:generate` | Generate new migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run setup:pgai` | Install pgai extension + create vectorizer (idempotent) |
| `npm run migrate:data` | Migrate data from MongoDB to PostgreSQL (one-time) |

### Docker Commands

```bash
docker compose up -d                  # Start all services
docker compose up -d db               # Start DB only (no vectorizer)
docker compose logs -f vectorizer-worker  # Watch embedding logs
docker compose down                   # Stop all
docker compose down -v                # Stop + wipe all data (fresh start)
```

---

## 11. Configuration Reference

All configuration lives in environment variables and `src/config.ts`.

### Environment Variables

```bash
# ── Required ─────────────────────────────────────────────────────
DATABASE_URL=postgres://brainly:brainly_dev@localhost:5432/brainly
JWT_SECRET=your-secret-at-least-32-chars

# ── Server ───────────────────────────────────────────────────────
PORT=5000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info                         # trace|debug|info|warn|error|fatal

# ── Database Pool ────────────────────────────────────────────────
DB_POOL_MAX=20                         # Max concurrent DB connections

# ── Auth ─────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=                      # Optional — enables Google OAuth

# ── Enrichment API Keys (all optional — degrades gracefully) ─────
YOUTUBE_API_KEY=                       # YouTube Data API v3
GITHUB_TOKEN=                          # GitHub Personal Access Token
TWITTER_BEARER_TOKEN=                  # Twitter/X Bearer Token
INSTAGRAM_APP_ID=                      # Instagram Basic Display API

# ── AI ───────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...                  # Required for embeddings + OpenAI LLM
LLM_PROVIDER=openai                    # 'openai' or 'anthropic'
ANTHROPIC_API_KEY=                     # Required if LLM_PROVIDER=anthropic

# ── Legacy (only for data migration) ─────────────────────────────
MONGO_URI=mongodb+srv://...
```

### `src/config.ts` — Feature Flags

```typescript
{
  providers: {
    youtube: true, twitter: true, instagram: true,
    github: true, medium: true, notion: true
  },
  extractors: {
    enabled: true,
    pollIntervalMs: 30_000,   // 30 seconds between enrichment batches
    maxRetries: 3,
    retryDelayMs: 60_000,     // 1 minute before retrying a failed item
  }
}
```

---

## 12. Production Readiness Assessment

### What Is Production-Ready

| Component | Status |
|-----------|--------|
| Schema design | ✅ Normalized, proper indexes, FK cascades |
| Authentication | ✅ bcrypt, JWT, Google OAuth, all races fixed |
| Error handling | ✅ try-catch on every endpoint, no stack trace leaks |
| Rate limiting | ✅ Global + per-route |
| Security headers | ✅ Helmet + CORS |
| Input validation | ✅ Zod on auth, manual checks on content |
| Enrichment service | ✅ Atomic claims, per-user fairness, retry logic, crash recovery |
| Graceful shutdown | ✅ SIGTERM/SIGINT: stops enrichment, closes server, drains pool |
| Database migrations | ✅ Versioned in `drizzle/` folder |
| Race conditions | ✅ All fixed with insert-catch-23505 pattern |

### Known Gaps (Before Real Production)

| Gap | Impact | Fix |
|-----|--------|-----|
| No `GET /health` endpoint | Can't tell if server is alive without SSHing | Add health check endpoint |
| Enrichment in-process | Crash = enrichment stops; no visibility | Separate process or BullMQ worker |
| No horizontal scaling for enrichment | Multiple instances = N polling loops | BullMQ + Redis job queue |
| No metrics or tracing | Can't diagnose performance issues | OpenTelemetry + Prometheus |
| Errors not tracked | No alerting on 500s | Sentry or similar |
| `.env` for secrets | Risk of accidental commit | AWS Secrets Manager / Doppler |
| No database backups | Data loss on volume deletion | Automated pg_dump + WAL archiving |
| No body size limit | Large payload attack vector | `express.json({ limit: '1mb' })` |
| Vectorizer worker has no restart policy | Silent crash = no embeddings | `restart: unless-stopped` in compose |

### Scalability Ceiling

| User count | Status | Bottleneck |
|------------|--------|-----------|
| 1–100 | ✅ Handles fine | None |
| 100–1,000 | ⚠️ Mostly fine | Enrichment poll inefficiency |
| 1,000–10,000 | ❌ Issues | Single process, no queue |
| 10,000+ | ❌ Not designed for | Full redesign of job system |

---

## 13. Roadmap

### Phase 0 — PostgreSQL Migration ✅ Complete

- Drizzle ORM schema + versioned migrations
- All API routes migrated from Mongoose to Drizzle
- pgai vectorizer configured for `contents.full_text`
- Vercel AI SDK LLM client scaffolded
- Enrichment service producing `full_text` data
- Schema has `summary` + `ai_tags` columns ready for Phase 1

### Phase 1 — Search + Summarization + Auto-tags 🔲

- `SemanticSearch` module — vector similarity via pgai
- `Summarizer` module — generates summary on content enrichment
- `AutoTagger` module — LLM-suggested tags from content analysis
- `GET /api/v1/search?q=<query>` endpoint
- Update enrichment pipeline to trigger summarization + tagging
- Frontend: search bar, summary on cards, tag suggestions UI

### Phase 2 — RAG Chat 🔲

- `RAGChat` module composing SemanticSearch + Vercel AI SDK
- `conversations` + `messages` tables
- Streaming chat endpoint (SSE)
- Chat UI with conversation list, message thread, source citations

### Phase 3 — Agentic AI 🔲 (Requires separate design session)

- Agent framework architecture
- Tool definitions: web search, content analysis, knowledge graph
- Research agent, curation agent, learning agent
- **This phase will be designed separately before implementation**
