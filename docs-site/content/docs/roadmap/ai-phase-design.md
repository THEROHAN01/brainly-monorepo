---
title: AI Phase Design
description: The planned AI intelligence layer — semantic search, summarization, auto-tagging, and RAG chat.
---

> **Date:** 2026-02-23 · **Status:** Approved
>
> **Scope:** Full AI intelligence layer — semantic search, summarization,
> auto-tagging, RAG chat, and agentic AI (Phase 3 requires a separate brainstorm
> before implementation).

## Context

Brainly is a personal knowledge management tool with a working MVP: URL saving
across 7 providers (YouTube, Twitter/X, Instagram, GitHub, Medium, Notion,
generic), background metadata enrichment (transcripts, articles,
READMEs), tagging, and brain sharing. The enrichment pipeline already extracts
full text from saved content — this is the foundation for AI features.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Database | PostgreSQL (migrate from MongoDB) | Required for pgai; better for relational data + vector search in one DB |
| AI Data Layer | pgai (Timescale) | Declarative embedding sync, vector search, chunking — all in PostgreSQL |
| ORM | Drizzle ORM | TypeScript-first, lightweight, allows raw SQL for pgai functions |
| LLM Abstraction | Vercel AI SDK | Provider-agnostic (OpenAI/Claude/Gemini/Ollama), streaming, tool calling, agents |
| Architecture | Modular AI packages | Each capability is a standalone module reusable across codebases |

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                      Frontend (React)                      │
│   Semantic Search · Chat UI (RAG) · Auto-tag · Summary     │
└───────┬────────────┬─────────────┬──────────────┬─────────┘
        │            │             │              │
┌───────▼────────────▼─────────────▼──────────────▼─────────┐
│                   Backend (Express + Drizzle)              │
│   ┌─────────────────────────────────────────────────────┐ │
│   │           Vercel AI SDK (Provider-Agnostic)          │ │
│   │   OpenAI | Claude | Gemini | Ollama (swappable)      │ │
│   └─────────────────────────────────────────────────────┘ │
│   Summarizer · RAG Engine · Agent Framework (Phase 3, TBD) │
│   ┌─────────────────────────────────────────────────────┐ │
│   │              pgai (PostgreSQL)                        │ │
│   │   Auto-embed Vectorizer · Vector Search · Chunks      │ │
│   └─────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Database schema (PostgreSQL)

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(50) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password        TEXT,
  google_id       TEXT UNIQUE,
  profile_picture TEXT,
  auth_provider   VARCHAR(20) DEFAULT 'local',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  link               TEXT NOT NULL,
  content_id         TEXT,
  type               VARCHAR(30),
  enrichment_status  VARCHAR(20) DEFAULT 'pending',
  enrichment_error   TEXT,
  enrichment_retries INT DEFAULT 0,
  enriched_at        TIMESTAMPTZ,
  meta_title         TEXT,
  meta_description   TEXT,
  meta_author        TEXT,
  meta_author_url    TEXT,
  meta_thumbnail     TEXT,
  meta_published_at  TIMESTAMPTZ,
  full_text          TEXT,
  full_text_type     VARCHAR(20),
  summary            TEXT,
  ai_tags            TEXT[],
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contents_user_created ON contents(user_id, created_at DESC);
CREATE INDEX idx_contents_enrichment ON contents(enrichment_status, created_at);

CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, user_id)
);

CREATE TABLE content_tags (
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

CREATE TABLE share_links (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash    VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  sources         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### pgai vectorizer

```sql
SELECT ai.create_vectorizer(
  'contents'::regclass,
  loading    => ai.loading_column('full_text'),
  chunking   => ai.chunking_recursive_character_text_splitter(
                  chunk_size => 1000, chunk_overlap => 200),
  formatting => ai.formatting_python_template(
                  'Title: $title\nType: $type\n\n$chunk'),
  embedding  => ai.embedding_openai('text-embedding-3-small', 1536)
);
```

Embeddings auto-sync whenever `full_text` is inserted or updated. No application
code needed for embedding management.

## Modular AI packages

```text
backend/src/ai/
├── shared/        # llm-client.ts (Vercel AI SDK wrapper), types.ts
├── summarizer/    # index.ts, prompts.ts, types.ts
├── search/        # index.ts, types.ts
├── tagger/        # index.ts, prompts.ts, types.ts
├── rag/           # index.ts, retriever.ts, prompts.ts, types.ts
└── agents/        # Phase 3 — framework.ts, tools/, *-agent.ts
```

Every module follows the same portable interface — explicit dependencies (model,
db, other modules) through the constructor, no global state:

```ts
class Summarizer {
  constructor(config: SummarizerConfig);
  async summarize(text: string, context?: string): Promise<Summary>;
  async summarizeStream(text: string): AsyncIterable<string>;
}

class SemanticSearch {
  constructor(config: SearchConfig);
  async search(query: string, userId: string, filters?: Filters): Promise<SearchResult[]>;
}

class RAGChat {
  constructor(config: RAGChatConfig);   // composes SemanticSearch
  async chat(messages: Message[], userId: string): Promise<ChatResponse>;
  async chatStream(messages: Message[], userId: string): AsyncIterable<ChatChunk>;
}
```

## New API endpoints

```text
GET  /api/v1/search?q=<query>&limit=20
     -> { results: [{ id, title, link, type, relevance, snippet }] }

GET  /api/v1/content/:id/ai-tags
     -> { suggestions: [{ tag, confidence }] }

POST /api/v1/chat   (SSE stream)
     Body: { conversationId?, message } -> { text, sources: [{contentId, title}] }

GET    /api/v1/conversations
GET    /api/v1/conversations/:id/messages
DELETE /api/v1/conversations/:id
```

## Build phases

- **Phase 0 — Foundation migration:** PostgreSQL + pgai locally (Docker), Drizzle
  schema matching current models, Mongo→PG data migration, route rewrite, pgai
  vectorizer, Vercel AI SDK provider abstraction.
- **Phase 1 — Search + Summarization + Auto-tags:** Summarizer, SemanticSearch,
  and AutoTagger modules; search endpoint + UI; summary display; tag suggestions.
- **Phase 2 — RAG Chat:** RAGChat module, conversation persistence, streaming SSE
  endpoint, chat UI with source citations.
- **Phase 3 — Agentic AI (separate design session):** agent framework, tool
  registry, research/curation/learning agents.

## Open questions

- pgai vectorizer worker: in-process or separate service?
- Embedding model: `text-embedding-3-small` (cheap/fast) vs `-3-large` (quality)?
- Rate limiting for AI endpoints (LLM calls are expensive).
- Cost management strategy for LLM API calls.
