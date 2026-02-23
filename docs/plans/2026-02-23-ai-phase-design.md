# Brainly AI Phase Design

**Date:** 2026-02-23
**Status:** Approved
**Scope:** Full AI intelligence layer -- semantic search, summarization, auto-tagging, RAG chat, and agentic AI (Phase 3 requires separate brainstorm before implementation)

---

## Context

Brainly is a personal knowledge management tool with a working MVP: URL saving from 9 platforms, background metadata enrichment (transcripts, articles, READMEs), tagging, and brain sharing. The enrichment pipeline already extracts full text from saved content -- this is the foundation for AI features.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL (migrate from MongoDB) | Required for pgai; better for relational data + vector search in one DB |
| AI Data Layer | pgai (Timescale) | Declarative embedding sync, vector search, chunking -- all in PostgreSQL |
| ORM | Drizzle ORM | TypeScript-first, lightweight, allows raw SQL for pgai functions |
| LLM Abstraction | Vercel AI SDK | Provider-agnostic (OpenAI/Claude/Gemini/Ollama), streaming, tool calling, agents |
| Architecture | Modular AI packages | Each capability (summarizer, search, tagger, RAG, agents) is a standalone module reusable across codebases |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (React)                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐ │
│  │ Semantic  │ │ Chat UI  │ │ Auto-tag  │ │  Summary   │ │
│  │ Search    │ │ (RAG)    │ │ Suggest   │ │  Display   │ │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └─────┬──────┘ │
└───────┼────────────┼─────────────┼──────────────┼────────┘
        │            │             │              │
┌───────▼────────────▼─────────────▼──────────────▼────────┐
│                   Backend (Express + Drizzle)              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Vercel AI SDK (Provider-Agnostic)          │  │
│  │   OpenAI | Claude | Gemini | Ollama (swappable)     │  │
│  └────────────────────┬────────────────────────────────┘  │
│  ┌────────────┐ ┌─────┴──────┐ ┌────────────────────┐   │
│  │ Summarizer │ │ RAG Engine │ │ Agent Framework     │   │
│  │ Module     │ │ Module     │ │ (Phase 3 - TBD)     │   │
│  └─────┬──────┘ └─────┬──────┘ └─────────┬──────────┘   │
│        │              │                   │               │
│  ┌─────▼──────────────▼───────────────────▼──────────┐   │
│  │              pgai (PostgreSQL)                      │   │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ Auto-embed│ │ Vector   │ │ Chunked Content  │  │   │
│  │  │ Vectorizer│ │ Search   │ │ Storage          │  │   │
│  │  └───────────┘ └──────────┘ └──────────────────┘  │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Database Schema (PostgreSQL)

### Users

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
```

### Contents

```sql
CREATE TABLE contents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  link               TEXT NOT NULL,
  content_id         TEXT,
  type               VARCHAR(30),

  -- Enrichment
  enrichment_status  VARCHAR(20) DEFAULT 'pending',
  enrichment_error   TEXT,
  enrichment_retries INT DEFAULT 0,
  enriched_at        TIMESTAMPTZ,

  -- Metadata (flattened)
  meta_title         TEXT,
  meta_description   TEXT,
  meta_author        TEXT,
  meta_author_url    TEXT,
  meta_thumbnail     TEXT,
  meta_published_at  TIMESTAMPTZ,
  full_text          TEXT,
  full_text_type     VARCHAR(20),

  -- AI fields
  summary            TEXT,
  ai_tags            TEXT[],

  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contents_user_created ON contents(user_id, created_at DESC);
CREATE INDEX idx_contents_enrichment ON contents(enrichment_status, created_at);
```

### Tags

```sql
CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, user_id)
);
```

### Content-Tags Junction

```sql
CREATE TABLE content_tags (
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);
```

### Share Links

```sql
CREATE TABLE share_links (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash    VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);
```

### Conversations (for RAG chat)

```sql
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
  sources         JSONB,               -- [{contentId, title, relevance}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### pgai Vectorizer

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

Embeddings auto-sync whenever `full_text` is inserted or updated. No application code needed for embedding management.

---

## Modular AI Packages

### Directory Structure

```
backend/src/ai/
├── shared/
│   ├── llm-client.ts        # Vercel AI SDK wrapper (provider config)
│   └── types.ts              # Shared interfaces (Summary, SearchResult, etc.)
├── summarizer/
│   ├── index.ts              # Standalone summarizer module
│   ├── prompts.ts            # System prompts for summarization
│   └── types.ts              # SummarizerConfig, Summary
├── search/
│   ├── index.ts              # Semantic search module
│   └── types.ts              # SearchConfig, SearchResult
├── tagger/
│   ├── index.ts              # Auto-tagger module
│   ├── prompts.ts            # Classification prompts
│   └── types.ts              # TaggerConfig, TagSuggestion
├── rag/
│   ├── index.ts              # RAG chat module
│   ├── retriever.ts          # pgai vector retrieval logic
│   ├── prompts.ts            # RAG system prompts
│   └── types.ts              # ChatConfig, Message, Source
└── agents/                   # Phase 3 - requires separate design session
    ├── framework.ts          # Agent runtime (tool loops)
    ├── tools/                # Reusable tool definitions
    ├── research-agent.ts
    ├── curation-agent.ts
    └── learning-agent.ts
```

### Module Design Pattern

Every module follows the same portable interface:

```typescript
// Example: Summarizer
interface SummarizerConfig {
  model: LanguageModel;           // Vercel AI SDK model (any provider)
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet-points';
}

class Summarizer {
  constructor(config: SummarizerConfig);
  async summarize(text: string, context?: string): Promise<Summary>;
  async summarizeStream(text: string): AsyncIterable<string>;
}

// Example: SemanticSearch
interface SearchConfig {
  db: DrizzleClient;              // Drizzle connection (for pgai queries)
  embeddingModel?: string;        // defaults to text-embedding-3-small
  topK?: number;
}

class SemanticSearch {
  constructor(config: SearchConfig);
  async search(query: string, userId: string, filters?: Filters): Promise<SearchResult[]>;
}

// Example: RAGChat
interface RAGChatConfig {
  model: LanguageModel;
  search: SemanticSearch;         // composes with search module
  maxContextChunks?: number;
}

class RAGChat {
  constructor(config: RAGChatConfig);
  async chat(messages: Message[], userId: string): Promise<ChatResponse>;
  async chatStream(messages: Message[], userId: string): AsyncIterable<ChatChunk>;
}
```

Key: each module takes explicit dependencies (model, db, other modules) through its constructor. No global state. Fully portable.

---

## API Endpoints (New)

### Semantic Search
```
GET /api/v1/search?q=<query>&limit=20
-> { results: [{ id, title, link, type, relevance, snippet }] }
```

### AI Suggestions
```
GET /api/v1/content/:id/ai-tags
-> { suggestions: [{ tag: string, confidence: number }] }
```

### Chat (RAG)
```
POST /api/v1/chat
Body: { conversationId?, message: string }
-> Streaming SSE response with { text, sources: [{contentId, title}] }

GET /api/v1/conversations
-> { conversations: [{ id, title, updatedAt }] }

GET /api/v1/conversations/:id/messages
-> { messages: [{ role, content, sources, createdAt }] }

DELETE /api/v1/conversations/:id
```

---

## Build Phases

### Phase 0: Foundation Migration
- Set up PostgreSQL + pgai locally (Docker)
- Define Drizzle schema matching current MongoDB models
- Write migration script (Mongo -> PG data transfer)
- Update all existing API routes to use Drizzle
- Set up pgai vectorizer for content embeddings
- Configure Vercel AI SDK with provider abstraction
- Ensure existing features work identically on PostgreSQL

### Phase 1: Search + Summarization + Auto-tags
- Implement Summarizer module -- generates summary on content enrichment
- Implement SemanticSearch module -- vector similarity via pgai
- Implement AutoTagger module -- suggests tags from content analysis
- Add search endpoint + UI (search bar with semantic results)
- Add summary display on content cards
- Add tag suggestion UI (accept/reject AI suggestions)
- Update enrichment pipeline to trigger summarization + tagging

### Phase 2: RAG Chat
- Implement RAGChat module composing SemanticSearch + AI SDK
- Implement conversation persistence (conversations + messages tables)
- Add streaming chat endpoint with SSE
- Build chat UI with conversation list, message thread, source citations
- Add conversation management (create, list, delete)

### Phase 3: Agentic AI (Requires Separate Design Session)
- Agent framework architecture
- Tool definitions and registry
- Research, curation, and learning agent designs
- **This phase will be brainstormed separately before implementation**

---

## Tech Stack Summary

| Layer | Current | After Migration |
|-------|---------|----------------|
| Database | MongoDB + Mongoose | PostgreSQL + Drizzle ORM + pgai |
| Vector Search | None | pgai (pgvector under the hood) |
| Embeddings | None | pgai auto-vectorizer (text-embedding-3-small) |
| LLM Calls | None | Vercel AI SDK (OpenAI/Claude/Gemini/Ollama) |
| AI Modules | None | Summarizer, Search, Tagger, RAG Chat |
| Agents | None | Phase 3 (TBD) |

## Open Questions

- pgai vectorizer worker: run in-process or as separate service?
- Embedding model choice: text-embedding-3-small (cheap, fast) vs text-embedding-3-large (better quality)?
- Rate limiting for AI endpoints (LLM calls are expensive)
- Cost management strategy for LLM API calls
