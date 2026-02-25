# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brainly is a "second brain" application — a personal knowledge management tool. This is the **backend** (Express.js + TypeScript).

**Database:** PostgreSQL + Drizzle ORM + pgai (migrated from MongoDB in Phase 0)
**AI Layer:** Vercel AI SDK (provider-agnostic: OpenAI / Anthropic)

## Common Commands

### Backend

```bash
npm run dev              # Build TypeScript + start server
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled server

npm run db:generate      # Generate new Drizzle migration from schema changes
npm run db:migrate       # Apply pending migrations to database
npm run setup:pgai       # Install pgai extension + create content vectorizer (run once)
npm run migrate:data     # Migrate data from MongoDB to PostgreSQL (run once)
```

### Docker (local dev)

```bash
docker compose up -d db                  # Start PostgreSQL + pgai
docker compose up -d                     # Start all services (DB + vectorizer worker)
docker compose down                      # Stop all services
docker compose down -v                   # Stop + delete volumes (fresh start)
```

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Express server — all API routes (Drizzle queries) |
| `src/db/schema.ts` | Drizzle schema — all table definitions |
| `src/db/relations.ts` | Drizzle relations — for relational queries |
| `src/db/index.ts` | Database connection (pg Pool + Drizzle) |
| `src/db/transforms.ts` | `withMongoId()` — converts `id` → `_id` for frontend compat |
| `src/db/setup-pgai.ts` | pgai vectorizer setup script |
| `src/middleware.ts` | JWT authentication middleware |
| `src/config.ts` | Feature flags + API key config |
| `src/providers/` | URL parsing (YouTube, Twitter, GitHub, etc.) |
| `src/extractors/` | Background metadata extraction |
| `src/services/enrichment.service.ts` | Background enrichment polling service |
| `src/ai/shared/llm-client.ts` | Vercel AI SDK wrapper (provider-agnostic) |
| `src/ai/shared/types.ts` | Shared AI module types |
| `scripts/migrate-mongo-to-pg.ts` | One-time MongoDB → PostgreSQL data migration |

### API Endpoints

**Auth:**
- `POST /api/v1/signup` — Register (bcrypt, Drizzle insert)
- `POST /api/v1/signin` — Login (returns JWT)
- `POST /api/v1/auth/google` — Google OAuth
- `GET /api/v1/me` — Current user profile

**Content:**
- `POST /api/v1/content` — Create (auto-detects type, triggers enrichment)
- `GET /api/v1/content` — List user's content (with populated tags)
- `DELETE /api/v1/content` — Delete by ID
- `POST /api/v1/content/validate` — Validate URL, get preview info
- `GET /api/v1/content/providers` — List supported providers
- `PUT /api/v1/content/:id/tags` — Update tags on content

**Tags:**
- `GET /api/v1/tags` — List user's tags
- `POST /api/v1/tags` — Create tag
- `DELETE /api/v1/tags/:id` — Delete tag (cascade removes from content)

**Brain Sharing:**
- `POST /api/v1/brain/share` — Create/delete share link
- `GET /api/v1/brain/:shareLink` — Public shared brain view

### Database Schema (PostgreSQL + Drizzle)

Tables: `users`, `tags`, `contents`, `content_tags` (junction), `share_links`

**Key design decision:** The frontend uses `_id` (MongoDB convention). The backend returns `_id` by applying `withMongoId()` from `src/db/transforms.ts` to all response objects.

**pgai vectorizer:** `contents.full_text` is auto-embedded by the vectorizer worker service. No application code needed — add content, the worker generates embeddings automatically.

### Content Provider System

Plugin-based URL parsing. Each provider implements `canHandle`, `extractId`, `getEmbedUrl`, `getCanonicalUrl`.

- Providers run on **both** frontend and backend
- Backend: `src/providers/` — validation, type detection
- Frontend: `src/providers/` — embed URL generation, display

Supported: YouTube, Twitter/X, Instagram, GitHub, Medium, Notion, Generic (fallback)

### Content Enrichment System

Background service (`src/services/enrichment.service.ts`) polls for `enrichmentStatus='pending'` content and runs extractors asynchronously.

- **Fair batching:** Uses `DISTINCT ON (user_id)` SQL to pick one item per user
- **Atomic claims:** `UPDATE ... WHERE status='pending'` prevents duplicate processing
- **Retry logic:** 3 attempts, 60s delay between retries
- **Extractors:** YouTube (Innertube API), Twitter (oEmbed), GitHub (REST API), Medium, Instagram, Generic

### AI Module Structure (Phase 1+)

```
src/ai/
├── shared/
│   ├── llm-client.ts   # Provider-agnostic LLM via Vercel AI SDK
│   └── types.ts        # Shared AI types
├── summarizer/         # Phase 1 — auto-summarization
├── search/             # Phase 1 — semantic search via pgai
├── tagger/             # Phase 1 — auto-tagging
└── rag/                # Phase 2 — chat with your brain
```

Each module is standalone and portable — no Brainly-specific dependencies.

## Environment Variables

```env
# Required
DATABASE_URL=postgres://brainly:brainly_dev@localhost:5432/brainly
JWT_SECRET=your-secret
PORT=5000
CORS_ORIGIN=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Enrichment API keys (optional — extractors degrade gracefully)
YOUTUBE_API_KEY=
GITHUB_TOKEN=
TWITTER_BEARER_TOKEN=

# AI
OPENAI_API_KEY=your-openai-key
LLM_PROVIDER=openai             # or: anthropic
ANTHROPIC_API_KEY=              # if using anthropic

# Legacy (only needed for data migration)
MONGO_URI=mongodb+srv://...
```

## Key Technologies

- Backend: Express 4, TypeScript, PostgreSQL, Drizzle ORM, pgai
- Auth: JWT (7d expiry), bcrypt, Google OAuth
- AI: Vercel AI SDK, pgai (vector embeddings), OpenAI / Anthropic
- Security: Helmet, express-rate-limit, Zod validation
- Logging: Pino structured logging
