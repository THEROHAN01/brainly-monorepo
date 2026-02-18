# Content Enrichment System — Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture — Providers vs Extractors](#architecture--providers-vs-extractors)
3. [Folder Structure](#folder-structure)
4. [Enrichment State Machine](#enrichment-state-machine)
5. [Interfaces & Types](#interfaces--types)
6. [Extractor Registry & Config](#extractor-registry--config)
7. [Per-Extractor Technical Reference](#per-extractor-technical-reference)
8. [Per-Provider URL Parsing Reference](#per-provider-url-parsing-reference)
9. [Enrichment Service — Background Poller](#enrichment-service--background-poller)
10. [MongoDB Schema & Query Patterns](#mongodb-schema--query-patterns)
11. [Security — SSRF Protection & Safe Fetch](#security--ssrf-protection--safe-fetch)
12. [Structured Logging](#structured-logging)
13. [Server Boot Sequence](#server-boot-sequence)
14. [Environment Variables](#environment-variables)
15. [Dependencies](#dependencies)
16. [Frontend Integration Status](#frontend-integration-status)
17. [API Endpoints Relevant to Enrichment](#api-endpoints-relevant-to-enrichment)
18. [Best Practices & Design Decisions](#best-practices--design-decisions)
19. [Testing Guide](#testing-guide)
20. [Future Roadmap](#future-roadmap)

---

## Overview

The Content Enrichment System is a background metadata extraction pipeline that automatically fetches rich metadata from saved URLs using provider-specific APIs. When a user saves a link (YouTube video, GitHub repo, Medium article, tweet, etc.), the system:

1. **Immediately** parses and classifies the URL via the **Provider** layer (synchronous, zero I/O).
2. **In the background** extracts full metadata via the **Extractor** layer (async, API calls, retries).

The extracted metadata powers future features like RAG-based search, AI Q&A over saved content, auto-tagging, and semantic recommendations.

**Design goals:**
- Zero cost — all APIs used are free-tier
- Zero user dependency — API keys are server-side, users never provide keys
- Modular — each provider/extractor is a self-contained plugin
- Resilient — retries, crash recovery, atomic claims, bounded concurrency
- RAG-ready — full-text extraction (transcripts, articles, READMEs) stored for vector embedding

---

## Architecture — Providers vs Extractors

This is the most important architectural distinction in the system. The two layers are **completely separate** and serve different purposes:

```
User saves a URL
       │
       ▼
┌──────────────────────────┐
│   PROVIDER LAYER         │   Synchronous, at save time
│   (providers/)           │   Pure string parsing, zero I/O
│                          │   Determines: type, contentId,
│                          │   embedUrl, canonicalUrl
│                          │   Runs on BOTH frontend & backend
└──────────┬───────────────┘
           │
           │  Content saved to MongoDB with enrichmentStatus: 'pending'
           │
           ▼
┌──────────────────────────┐
│   EXTRACTOR LAYER        │   Asynchronous, background service
│   (extractors/)          │   Network I/O to external APIs
│                          │   Fetches: title, description,
│                          │   fullText, transcripts, stats
│                          │   Runs on BACKEND ONLY
└──────────────────────────┘
```

| Dimension            | Providers                          | Extractors                              |
|----------------------|------------------------------------|-----------------------------------------|
| **Purpose**          | Parse and classify a URL           | Fetch rich metadata from APIs           |
| **When it runs**     | Synchronously during POST          | Asynchronously in background poller     |
| **What it produces** | `ParsedContent` (type, embedUrl)   | `ExtractedMetadata` (fullText, stats)   |
| **I/O cost**         | Zero (pure string parsing)         | Network calls to external APIs          |
| **Failure impact**   | Request returns 400                | Sets enrichmentStatus to `failed`       |
| **Requires API key** | Never                              | Some (YouTube, optionally GitHub)       |
| **Runs where**       | Frontend + Backend                 | Backend only                            |
| **Interface**        | `ContentProvider`                  | `ContentExtractor`                      |

**Why separate?** The provider tells the system _what_ the content is and _how to embed_ it. The extractor tells the system _everything about_ the content for AI/search. Providers must be fast and synchronous (they block the save request). Extractors can take seconds and must never block the user.

---

## Folder Structure

```
backend/src/
├── config.ts                              # Global config: provider flags, extractor settings, API keys
├── db.ts                                  # Mongoose schemas (Content, User, Link, Tag)
├── index.ts                               # Express app, routes, async server boot
├── logger.ts                              # Pino structured logger
├── middleware.ts                          # JWT auth middleware
├── utils.ts                               # Utility helpers
│
├── providers/                             # URL PARSING layer
│   ├── base.ts                            # ContentProvider, ParsedContent, EmbedType interfaces
│   ├── index.ts                           # Registry: parseUrl(), getProvider(), getProviderInfo()
│   ├── youtube.provider.ts                # YouTube URL parser
│   ├── twitter.provider.ts                # Twitter/X URL parser
│   ├── instagram.provider.ts              # Instagram URL parser
│   ├── github.provider.ts                 # GitHub URL parser
│   ├── medium.provider.ts                 # Medium URL parser
│   ├── notion.provider.ts                 # Notion URL parser
│   └── generic.provider.ts                # Fallback: any HTTP/HTTPS URL (MD5 hash ID)
│
├── extractors/                            # METADATA FETCHING layer
│   ├── base.ts                            # ExtractedMetadata, ContentExtractor interfaces
│   ├── registry.ts                        # getExtractor(), isExtractorConfigured()
│   ├── safe-fetch.ts                      # SSRF-protected fetch with timeout & size limits
│   ├── html-utils.ts                      # Shared stripHtml() utility
│   ├── youtube.extractor.ts               # YouTube Data API v3 + youtube-transcript
│   ├── twitter.extractor.ts               # Twitter oEmbed API (free, no key)
│   ├── instagram.extractor.ts             # OG meta tag scraping
│   ├── github.extractor.ts                # GitHub REST API (repos, issues, PRs, gists)
│   ├── medium.extractor.ts                # @extractus/article-extractor
│   └── generic.extractor.ts               # article-extractor + OG meta fallback
│
└── services/
    └── enrichment.service.ts              # Background poller: fair batching, concurrency, retries

frontend/src/
├── providers/                             # Mirror of backend providers (client-side URL parsing)
│   ├── base.ts
│   ├── index.ts
│   ├── youtube.provider.ts
│   ├── twitter.provider.ts
│   ├── instagram.provider.ts
│   ├── github.provider.ts
│   ├── medium.provider.ts
│   ├── notion.provider.ts
│   └── generic.provider.ts
│
├── config/
│   └── providers.ts                       # Frontend provider feature flags
│
└── components/ui/
    └── Card.tsx                            # Renders embed/card per content type
```

---

## Enrichment State Machine

The `enrichmentStatus` field on `ContentModel` drives the enrichment lifecycle:

```
         POST /api/v1/content (user saves a URL)
                      │
                      ▼
                  [ pending ]  ◄──────────────────────────┐
                      │                                    │
          Enrichment service polls                    retry (if retries
          (every 30 seconds)                          < maxRetries AND
                      │                               retryDelayMs elapsed)
                      ▼                                    │
         findOneAndUpdate atomic claim                     │
          pending → [ processing ]                         │
                      │                                    │
          ┌───────────┼───────────────┐                    │
          │           │               │                    │
     extractor    extractor      no extractor          extractor
     succeeds      throws        configured             throws
          │           │               │                    │
          ▼           │               ▼                    │
     [ enriched ]     │          [ skipped ]               │
                      │                                    │
                      ├── retries < max ───────────────────┘
                      │
                      └── retries >= max
                                │
                                ▼
                           [ failed ]
```

| State        | Meaning                                                       |
|--------------|---------------------------------------------------------------|
| `pending`    | Newly created, or previously failed and eligible for retry    |
| `processing` | Atomically claimed by a worker; prevents double processing    |
| `enriched`   | Metadata successfully extracted and stored in `metadata` field|
| `failed`     | All retries exhausted; `enrichmentError` has last error       |
| `skipped`    | No configured extractor for this content type                 |

**Crash recovery:** On server startup, `startEnrichmentService()` resets all documents stuck in `processing` back to `pending` via `updateMany`. This handles the case where the server crashed mid-extraction.

---

## Interfaces & Types

### ExtractedMetadata (`extractors/base.ts`)

```typescript
interface ExtractedMetadata {
    // Common metadata
    title?: string;
    description?: string;
    author?: string;
    authorUrl?: string;
    thumbnailUrl?: string;
    publishedDate?: string;
    tags?: string[];
    language?: string;

    // Full text content for RAG/search
    fullText?: string;
    fullTextType?: 'transcript' | 'article' | 'markdown' | 'plain';

    // Timestamped transcript segments (YouTube)
    transcriptSegments?: Array<{
        text: string;
        start: number;      // seconds
        duration: number;    // seconds
    }>;

    // Provider-specific structured data (varies per extractor)
    providerData?: Record<string, any>;

    // Extraction audit trail
    extractedAt: Date;
    extractorVersion: string;
}
```

### ContentExtractor (`extractors/base.ts`)

```typescript
interface ContentExtractor {
    type: string;               // Must match the provider type (e.g., 'youtube')
    displayName: string;        // Human-readable name for logging
    isConfigured(): boolean;    // Returns false if required API key is missing
    extract(url: string, contentId: string): Promise<ExtractedMetadata>;
}
```

### ContentProvider (`providers/base.ts`)

```typescript
type EmbedType = 'iframe' | 'oembed' | 'card' | 'none';

interface ContentProvider {
    type: string;
    displayName: string;
    hostnames: string[];
    supportsEmbed: boolean;
    embedType: EmbedType;
    canHandle(url: URL): boolean;
    extractId(url: URL): string | null;
    getEmbedUrl?(contentId: string): string;
    getCanonicalUrl(contentId: string): string;
}

interface ParsedContent {
    type: string;
    displayName: string;
    contentId: string;
    originalUrl: string;
    embedUrl?: string;
    canonicalUrl: string;
    canEmbed: boolean;
    embedType: EmbedType;
}
```

### SafeFetch (`extractors/safe-fetch.ts`)

```typescript
interface SafeFetchOptions extends RequestInit {
    timeoutMs?: number;         // Default: 15,000ms
    maxBodyBytes?: number;      // Default: 5MB
    skipSsrfCheck?: boolean;    // true for known-safe API domains
}

// Exported functions
async function safeFetch(url: string, options?: SafeFetchOptions): Promise<Response>;
async function safeFetchText(url, options?): Promise<{ response: Response; text: string }>;
async function safeFetchJson<T>(url, options?): Promise<{ response: Response; data: T }>;
```

### HTML Utilities (`extractors/html-utils.ts`)

```typescript
// Converts <br> to \n, </p> to \n\n, strips all tags,
// decodes HTML entities, collapses 3+ newlines to 2
function stripHtml(html: string): string;
```

---

## Extractor Registry & Config

### Config (`config.ts`)

```typescript
export const config = {
    providers: {
        youtube:   true,      // Enable/disable URL parsing for each type
        twitter:   true,
        instagram: true,
        github:    true,
        medium:    true,
        notion:    true,
    },

    extractors: {
        enabled:        true,       // Master switch for enrichment
        pollIntervalMs: 30_000,     // 30 seconds between poll cycles
        maxRetries:     3,          // Max attempts before marking 'failed'
        retryDelayMs:   60_000,     // 1 minute minimum between retries
    },

    apiKeys: {
        youtubeApiKey:      process.env.YOUTUBE_API_KEY || '',
        githubToken:        process.env.GITHUB_TOKEN || '',
        twitterBearerToken: process.env.TWITTER_BEARER_TOKEN || '',
        instagramAppId:     process.env.INSTAGRAM_APP_ID || '',
    },
};
```

### Registry (`extractors/registry.ts`)

```typescript
// Maps content type → extractor instance
// Only registers extractors whose type is enabled in config.providers
function getExtractor(type: string): ContentExtractor | null;
function isExtractorConfigured(type: string): boolean;
```

The registry is the glue layer. When the enrichment service encounters a content item of type `'youtube'`, it calls `getExtractor('youtube')` to get the appropriate extractor instance.

---

## Per-Extractor Technical Reference

### YouTube Extractor

| Property           | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **API**            | `https://www.googleapis.com/youtube/v3/videos`               |
| **Parts fetched**  | `snippet, contentDetails, statistics, topicDetails, status`  |
| **Requires key**   | Yes — `YOUTUBE_API_KEY` (free: 10,000 units/day)             |
| **Transcript**     | `youtube-transcript` npm package (no API key needed)         |
| **fullTextType**   | `'transcript'`                                               |
| **Transcript format** | Both timestamped segments AND concatenated plain text     |

**providerData fields:**
`channelId`, `categoryId`, `duration` (ISO 8601), `definition`, `captionAvailable`,
`viewCount`, `likeCount`, `commentCount`, `topicCategories`, `liveBroadcastContent`,
`license`, `embeddable`

**Error handling:** Transcript fetch failures are non-fatal — logged as warning, enrichment continues with API metadata only.

**Unit conversion:** `youtube-transcript` returns offset/duration in milliseconds; extractor converts to seconds (`/ 1000`).

---

### Twitter Extractor

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| **API**          | `https://publish.twitter.com/oembed` (free, no key)|
| **Requires key** | No                                                 |
| **fullTextType** | `'plain'`                                          |

**Text extraction:** Parses `<p>` content from embed HTML via regex `/<p[^>]*>([\s\S]*?)<\/p>/i`, then strips HTML tags and decodes entities.

**providerData fields:** `embedHtml`, `oembedUrl`

---

### Instagram Extractor

| Property         | Value                                                    |
|------------------|----------------------------------------------------------|
| **Method**       | OG meta tag scraping via `safeFetchText`                 |
| **Requires key** | No                                                       |
| **User-Agent**   | `Mozilla/5.0 (compatible; Brainly/1.0)`                  |
| **fullTextType** | `'plain'`                                                |

**Parsing:** Extracts `og:title`, `og:description`, `og:image`, `og:type`, `og:site_name` from HTML meta tags.

**Author extraction:** Regex `/^(.+?)\s+on\s+Instagram/i` on `og:title`.

**Hashtag extraction:** Regex `/#[a-zA-Z0-9_]+/g` from description, `#` prefix stripped.

**Validation:** Throws if no title, description, or fullText was extracted (Instagram likely blocked the request).

**providerData fields:** `mediaType`, `siteName`

---

### GitHub Extractor

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| **API**          | `https://api.github.com` REST API                  |
| **Requires key** | No (but recommended — 60 req/hr without, 5,000 with) |
| **Auth header**  | `Authorization: Bearer {GITHUB_TOKEN}` if configured|

**Resource detection via contentId format:**
- `gist/*` → gist API endpoint
- Contains `/issues/`, `/pull/`, `/discussions/` → issues API endpoint
- Everything else → repos API endpoint

| Resource   | fullTextType  | fullText content           |
|------------|---------------|----------------------------|
| Repository | `'markdown'`  | Full README.md content     |
| Issue/PR   | `'plain'`     | Full issue/PR body         |
| Gist       | `'plain'`     | All file contents concatenated as fenced code blocks |

**README decoding:** GitHub API returns README as base64; extractor decodes via `Buffer.from(content, 'base64').toString('utf-8')`.

**Issue description:** Truncated to 500 chars for `description` field; full body in `fullText`.

**providerData.resourceType:** `'repository'`, `'pull_request'`, `'issue'`, or `'gist'`

**SSRF:** Uses `skipSsrfCheck: true` since `api.github.com` is a known-safe domain.

---

### Medium Extractor

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| **Library**      | `@extractus/article-extractor` (dynamic ESM import)|
| **Requires key** | No                                                 |
| **fullTextType** | `'article'`                                        |

**ESM/CJS interop:** `@extractus/article-extractor` is ESM-only but the backend uses CommonJS. Solved with dynamic `import()`:
```typescript
const { extract } = await import('@extractus/article-extractor');
```

**fullText:** `stripHtml(article.content)` — strips all HTML, preserves paragraph breaks.

**providerData fields:** `source`, `ttr` (time-to-read in seconds), `favicon`, `type`

---

### Generic Extractor

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| **type**         | `'link'` (matches genericProvider)                 |
| **Requires key** | No                                                 |
| **fullTextType** | `'article'`                                        |

**Two-stage strategy:**
1. **Primary:** `@extractus/article-extractor` on the full URL
2. **Fallback:** OG meta tag scraping via `safeFetchText` (parses `og:title`, `og:description`, `og:image`)

**Error handling:** Never throws. Returns a minimal metadata object even if both strategies fail. This ensures generic links always reach `enriched` status.

**SSRF:** Full SSRF check is applied (user-supplied arbitrary URLs).

---

## Per-Provider URL Parsing Reference

### YouTube Provider

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Hostnames**  | `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`       |
| **ID regex**   | `/^[a-zA-Z0-9_-]{11}$/` (exactly 11 chars)                         |
| **URL formats**| `/watch?v=`, `youtu.be/`, `/shorts/`, `/live/`, `/embed/`, `/v/`    |
| **embedType**  | `iframe`                                                            |
| **Embed URL**  | `https://www.youtube.com/embed/{contentId}`                         |

### Twitter Provider

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Hostnames**  | `twitter.com`, `x.com` (+ www/mobile variants)                     |
| **ID regex**   | `/^\d{1,19}$/` (Snowflake IDs)                                     |
| **Path format**| `/{username}/status/{tweetId}`                                      |
| **embedType**  | `oembed`                                                            |

### Instagram Provider

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Hostnames**  | `instagram.com`, `www.instagram.com`, `m.instagram.com`             |
| **Shortcode**  | `/^[a-zA-Z0-9_-]{8,14}$/`                                          |
| **Path formats**| `/p/`, `/reel/`, `/tv/`                                            |
| **embedType**  | `oembed`                                                            |
| **Embed URL**  | `https://www.instagram.com/p/{contentId}/embed`                     |

### GitHub Provider

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Hostnames**  | `github.com`, `gist.github.com`                                     |
| **embedType**  | `card` (no embed support)                                           |
| **ID formats** | `owner/repo`, `owner/repo/issues/N`, `owner/repo/pull/N`, `gist/user/id` |
| **Blocked**    | settings, marketplace, explore, topics, trending, login, signup, etc. |

### Medium Provider

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Hostnames**  | `medium.com`, `*.medium.com`                                        |
| **ID regex**   | `/^[a-f0-9]{10,12}$/i`                                             |
| **Extraction** | Short link `/p/{id}` or trailing `-{hexId}` on slug                 |
| **embedType**  | `card`                                                              |

### Notion Provider

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Hostnames**  | `notion.so`, `notion.site`, `*.notion.site`                         |
| **ID format**  | 32-char hex UUID (dashes stripped on storage)                        |
| **embedType**  | `card`                                                              |

### Generic Provider (Fallback)

| Property       | Value                                                               |
|----------------|---------------------------------------------------------------------|
| **Matches**    | Any `http:` or `https:` URL (always last in registry)               |
| **contentId**  | MD5 hash of `url.href`, truncated to 12 characters                  |
| **embedType**  | `card`                                                              |

---

## Enrichment Service — Background Poller

**File:** `backend/src/services/enrichment.service.ts`

### Constants

```typescript
const BATCH_SIZE = 5;       // Max items per poll cycle
const CONCURRENCY = 3;      // Max parallel extractor calls
```

### Lifecycle

```typescript
export async function startEnrichmentService(): Promise<void>;  // Start polling
export function stopEnrichmentService(): void;                   // Stop polling
```

### Processing Flow

1. **Guard check:** If `isProcessing` is true, skip this cycle (prevents overlapping polls).
2. **Fair batch selection:** MongoDB aggregation groups by `userId`, picks one pending item per user, sorts by `createdAt` (oldest first), limits to `BATCH_SIZE`.
3. **Atomic claim:** For each item, `findOneAndUpdate({ _id, enrichmentStatus: 'pending' }, { enrichmentStatus: 'processing' })`. Returns `null` if already claimed by another instance.
4. **Bounded concurrency:** `runWithConcurrency()` processes up to `CONCURRENCY` items simultaneously using a `Promise.race` pool pattern.
5. **Extract:** Calls `extractor.extract(url, contentId)`.
6. **On success:** Writes metadata, sets status to `enriched`.
7. **On failure:** Increments retries, sets status back to `pending` (or `failed` if max retries exceeded).

### Per-User Fairness

The aggregation pipeline ensures that if User A has 100 pending items and User B has 1, both get served in the same cycle. Without this, User A would monopolize the queue.

```typescript
// Aggregation pipeline (simplified)
[
    { $match: { enrichmentStatus: 'pending', /* retry eligibility */ } },
    { $sort: { createdAt: 1 } },           // Oldest first
    { $group: {
        _id: '$userId',                     // One item per user
        docId: { $first: '$_id' },
        // ... other fields
    }},
    { $sort: { createdAt: 1 } },           // Oldest-user-item first across users
    { $limit: BATCH_SIZE },
]
```

### Bounded Concurrency

```typescript
async function runWithConcurrency(
    tasks: Array<() => Promise<void>>,
    limit: number
): Promise<void>
```

Uses a `Promise.race` pool: maintains up to `limit` in-flight promises. When one resolves, the next task starts. This prevents overwhelming external APIs.

---

## MongoDB Schema & Query Patterns

### ContentSchema Enrichment Fields

```typescript
{
    // ... existing fields (title, link, type, contentId, userId, tags) ...

    enrichmentStatus: {
        type: String,
        enum: ['pending', 'processing', 'enriched', 'failed', 'skipped'],
        default: 'pending'
    },
    enrichmentError:   { type: String },
    enrichmentRetries: { type: Number, default: 0 },
    enrichedAt:        { type: Date },

    metadata: {
        title:          { type: String },
        description:    { type: String },
        author:         { type: String },
        authorUrl:      { type: String },
        thumbnailUrl:   { type: String },
        publishedDate:  { type: Date },
        tags:           [{ type: String }],
        language:       { type: String },

        fullText:       { type: String },
        fullTextType:   { type: String, enum: ['transcript', 'article', 'markdown', 'plain'] },

        transcriptSegments: [{
            text:     { type: String },
            start:    { type: Number },   // seconds
            duration: { type: Number },   // seconds
        }],

        providerData:      { type: Schema.Types.Mixed },
        extractedAt:       { type: Date },
        extractorVersion:  { type: String },
    },
}
// Schema options: { timestamps: true } — auto createdAt/updatedAt
```

### Indexes

```typescript
ContentSchema.index({ userId: 1, createdAt: -1 });          // User content listing
ContentSchema.index({ enrichmentStatus: 1, createdAt: 1 }); // Enrichment polling
```

### Key Query Patterns

**Crash recovery (startup):**
```typescript
ContentModel.updateMany(
    { enrichmentStatus: 'processing' },
    { enrichmentStatus: 'pending' }
);
```

**Atomic claim (optimistic locking):**
```typescript
ContentModel.findOneAndUpdate(
    { _id, enrichmentStatus: 'pending' },   // Only if still pending
    { enrichmentStatus: 'processing' },
    { new: true }
);
// Returns null if another instance claimed it — safe for multi-instance
```

**On success:**
```typescript
ContentModel.updateOne(
    { _id },
    {
        enrichmentStatus: 'enriched',
        $unset: { enrichmentError: 1 },
        enrichedAt: new Date(),
        metadata,
    }
);
```

**On failure:**
```typescript
ContentModel.updateOne(
    { _id },
    {
        enrichmentStatus: retries >= max ? 'failed' : 'pending',
        enrichmentError: err.message,
        enrichmentRetries: retries,
    }
);
```

**On no extractor:**
```typescript
ContentModel.updateOne(
    { _id },
    {
        enrichmentStatus: 'skipped',
        enrichmentError: `No configured extractor for type: ${type}`,
    }
);
```

---

## Security — SSRF Protection & Safe Fetch

**File:** `backend/src/extractors/safe-fetch.ts`

All external HTTP requests in the extractor layer go through `safeFetch()`, which provides three layers of protection:

### 1. SSRF Prevention

Resolves the hostname via DNS and checks all returned IPv4 addresses against blocked private ranges:

| Range              | Description          |
|--------------------|----------------------|
| `10.x.x.x`        | Class A private      |
| `172.16-31.x.x`   | Class B private      |
| `192.168.x.x`     | Class C private      |
| `127.x.x.x`       | Loopback             |
| `169.254.x.x`     | Link-local           |
| `0.0.0.0`          | Unspecified           |
| `::1`              | IPv6 loopback        |
| `fe80::`           | IPv6 link-local      |
| `fc00::`/`fd00::`  | IPv6 ULA             |

**Bypass:** Extractors calling known-safe APIs (YouTube Data API, GitHub API) use `skipSsrfCheck: true` to avoid unnecessary DNS resolution overhead.

### 2. Timeout Enforcement

Uses `AbortController` with `setTimeout`. Default: 15 seconds. Throws `Fetch timed out after Nms` on `AbortError`.

### 3. Body Size Limiting

- **Fast path:** Checks `Content-Length` header before reading body.
- **Streaming path:** If no Content-Length, streams response body with a running byte counter. Throws `Response too large` if exceeded.
- **Default limit:** 5MB.

---

## Structured Logging

**File:** `backend/src/logger.ts`

Uses [Pino](https://github.com/pinojs/pino) for structured JSON logging.

```typescript
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
```

**Usage pattern — child loggers for context:**

```typescript
// In enrichment.service.ts
const log = logger.child({ service: 'enrichment' });

// Per-content processing
const contentLog = log.child({ contentId, type, url });
contentLog.info('Processing content');
contentLog.error({ err, attempt, maxRetries }, 'Extraction failed');
```

**Why Pino?**
- Structured JSON output (machine-parseable for log aggregation)
- Child loggers add context without string concatenation
- Fastest Node.js logger (low overhead in production)
- Pretty-printing available in development via `pino-pretty` transport

---

## Server Boot Sequence

```
main() in index.ts
    │
    ├─ 1. connectDB()
    │      └── mongoose.connect(MONGO_URI)
    │
    ├─ 2. app.listen(PORT)
    │      └── logger.info({ port }, 'Server running')
    │
    └─ 3. startEnrichmentService()
           ├── Check config.extractors.enabled (skip if false)
           ├── Reset stale 'processing' → 'pending' (crash recovery)
           ├── Log poll interval
           ├── processNextBatch() — immediate first run
           └── setInterval(processNextBatch, pollIntervalMs)

main().catch((err) => {
    logger.fatal({ err }, 'Fatal startup error');
    process.exit(1);
});
```

**Why async main()?**
- `connectDB()` must complete before the server accepts requests
- `startEnrichmentService()` must complete crash recovery before polling starts
- Fatal errors during boot surface immediately with proper logging and exit code

---

## Environment Variables

### Backend (`.env`)

| Variable               | Required?    | Default              | Purpose                              |
|------------------------|-------------|----------------------|--------------------------------------|
| `MONGO_URI`            | **Yes**     | —                    | MongoDB connection string            |
| `JWT_SECRET`           | **Yes**     | —                    | JWT signing key (exits if missing)   |
| `GOOGLE_CLIENT_ID`     | No          | —                    | Google OAuth (disabled if absent)    |
| `PORT`                 | No          | `5000`               | Express server port                  |
| `CORS_ORIGIN`          | No          | `http://localhost:5173` | Allowed CORS origin              |
| `LOG_LEVEL`            | No          | `info`               | Pino log level                       |
| `YOUTUBE_API_KEY`      | No          | `''`                 | YouTube Data API v3 key              |
| `GITHUB_TOKEN`         | No          | `''`                 | GitHub PAT (60→5000 req/hr)          |
| `TWITTER_BEARER_TOKEN` | No          | `''`                 | Twitter Bearer (unused currently)    |
| `INSTAGRAM_APP_ID`     | No          | `''`                 | Instagram App ID (unused currently)  |

**API key behavior:** If an API key is missing, the corresponding extractor's `isConfigured()` returns `false`, and the enrichment service marks those content items as `skipped`. The system gracefully degrades — it never crashes due to missing optional keys.

---

## Dependencies

### Backend — Enrichment-Related

| Package                        | Version | Purpose                                    |
|--------------------------------|---------|--------------------------------------------|
| `@extractus/article-extractor` | ^8.x    | Full-text article extraction (Medium, generic) |
| `youtube-transcript`           | ^1.x    | YouTube caption/transcript fetching (free)  |
| `pino`                         | ^10.x   | Structured JSON logging                     |
| `@types/pino`                  | ^7.x    | TypeScript types for Pino                   |

### ESM/CJS Note

`@extractus/article-extractor` is an ESM-only package (`"type": "module"` in its package.json), but the backend uses CommonJS (`"module": "commonjs"` in tsconfig). This is resolved with **dynamic `import()`** in the Medium and Generic extractors:

```typescript
// Instead of: import { extract } from '@extractus/article-extractor';
const { extract } = await import('@extractus/article-extractor');
```

---

## Frontend Integration Status

### Current State

The frontend **does not yet consume enrichment metadata**. The `Card.tsx` component renders content based on provider data only (type, embedUrl, contentId). The enriched `metadata` object (title, description, thumbnailUrl, fullText, etc.) is:

- Stored in MongoDB
- Returned in `GET /api/v1/content` API responses
- **Not yet rendered in any frontend component**

### What's Available for Frontend Consumption

The `GET /api/v1/content` response includes the full `metadata` sub-document on each content item:

```json
{
    "content": [{
        "title": "User-supplied title",
        "link": "https://youtube.com/watch?v=abc123",
        "type": "youtube",
        "contentId": "abc123",
        "enrichmentStatus": "enriched",
        "metadata": {
            "title": "Video Title from YouTube API",
            "description": "Full video description...",
            "author": "Channel Name",
            "thumbnailUrl": "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
            "fullText": "Full transcript text...",
            "transcriptSegments": [{ "text": "Hello...", "start": 0.5, "duration": 2.1 }],
            "tags": ["javascript", "tutorial"],
            "providerData": { "viewCount": "1234567", "likeCount": "5678" },
            "extractedAt": "2024-01-15T10:30:00Z",
            "extractorVersion": "1.0.0"
        }
    }]
}
```

### No Frontend Changes Required for Enrichment

The enrichment system is entirely backend. No frontend changes are needed for it to work. The frontend will need updates only when you want to **display** the enriched metadata (e.g., showing thumbnails, view counts, article previews).

---

## API Endpoints Relevant to Enrichment

| Method | Path                        | Auth | Enrichment Role                              |
|--------|-----------------------------|------|----------------------------------------------|
| POST   | `/api/v1/content`           | JWT  | Creates content → `enrichmentStatus: pending` |
| POST   | `/api/v1/content/validate`  | JWT  | Validates URL (no DB write, no enrichment)    |
| GET    | `/api/v1/content`           | JWT  | Returns content with full `metadata` object   |
| GET    | `/api/v1/brain/:shareLink`  | None | Public shared brain — includes `metadata`     |
| GET    | `/api/v1/content/providers` | None | Returns provider info (no enrichment data)    |

---

## Best Practices & Design Decisions

### 1. Plugin Architecture
Each provider and extractor is a self-contained module implementing a standard interface. Adding a new content type requires:
- One provider file (URL parsing)
- One extractor file (metadata fetching)
- One line in each registry
- One flag in config

### 2. Separation of Concerns
Providers and extractors are completely independent systems. A provider can exist without an extractor (URL will be parsed but not enriched). An extractor requires a matching provider (it needs the parsed type and contentId).

### 3. Fail-Safe Defaults
- Missing API keys → content is `skipped`, never crashes
- Extractor throws → retries with backoff, eventually `failed`
- Generic extractor never throws → any URL gets at least minimal metadata
- YouTube transcript failure → non-fatal warning, API metadata still stored

### 4. Optimistic Locking
Atomic `findOneAndUpdate` prevents race conditions in multi-instance deployments. Two server instances can safely run enrichment without double-processing.

### 5. Fair Scheduling
Per-user grouping in the aggregation pipeline prevents queue monopolization. Every user gets served, regardless of how many items they have pending.

### 6. Defense in Depth (SSRF)
User-supplied URLs go through DNS resolution and private IP blocking before any HTTP request. Known-safe API endpoints bypass this check for performance.

### 7. Bounded Resource Usage
- Max 3 concurrent API calls (CONCURRENCY)
- Max 5 items per poll cycle (BATCH_SIZE)
- 5MB response body limit
- 15s request timeout
- These prevent the enrichment service from overwhelming external APIs or consuming excessive memory.

### 8. Idempotent Processing
Re-processing an already-enriched item (if it somehow got reset to pending) would simply overwrite metadata with fresh data. No side effects, no duplicates.

### 9. Schema Design for Future Migration
The `metadata` sub-document is structured (not `Schema.Types.Mixed`) with explicit fields. This makes it straightforward to map to a Postgres table with proper columns when migrating from MongoDB.

### 10. Observability
Structured logging with Pino child loggers provides per-content-item context in every log line. Combined with `enrichmentStatus` and `enrichmentError` fields in the database, every enrichment attempt is fully traceable.

---

## Testing Guide

### Prerequisites

1. Backend and MongoDB running
2. API keys configured in `backend/.env`:
   ```
   YOUTUBE_API_KEY=your_key_here
   GITHUB_TOKEN=your_token_here   # optional but recommended
   ```

### Quick Smoke Test

1. Start the backend:
   ```bash
   cd backend && npm run dev
   ```

2. Watch logs — you should see:
   ```
   {"level":30,"msg":"Server running","port":5000}
   {"level":30,"msg":"Enrichment service started","pollIntervalMs":30000}
   ```

3. Save a YouTube link via the frontend (or curl):
   ```bash
   curl -X POST http://localhost:5000/api/v1/content \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "Test Video"}'
   ```

4. Within 30 seconds, the enrichment service should process it. Watch logs for:
   ```
   {"level":30,"msg":"Processing content","contentId":"dQw4w9WgXcQ","type":"youtube"}
   {"level":30,"msg":"Content enriched successfully","contentId":"dQw4w9WgXcQ"}
   ```

5. Fetch the content and verify metadata is populated:
   ```bash
   curl http://localhost:5000/api/v1/content \
     -H "Authorization: Bearer YOUR_JWT" | jq '.[0].metadata'
   ```

### Testing Each Provider

| Type       | Test URL                                          | Expected fullTextType |
|------------|---------------------------------------------------|-----------------------|
| YouTube    | `https://youtube.com/watch?v=dQw4w9WgXcQ`        | `transcript`          |
| Twitter    | `https://twitter.com/elonmusk/status/1234567890`  | `plain`               |
| Instagram  | `https://instagram.com/p/ABC123xyz/`              | `plain`               |
| GitHub     | `https://github.com/facebook/react`               | `markdown`            |
| Medium     | `https://medium.com/p/abc123def456`               | `article`             |
| Generic    | `https://example.com/any-article`                 | `article`             |

### Verifying Enrichment Status in MongoDB

```javascript
// MongoDB shell or Compass
db.contents.find(
    { enrichmentStatus: { $ne: 'pending' } },
    { title: 1, type: 1, enrichmentStatus: 1, 'metadata.title': 1, 'metadata.fullTextType': 1 }
);
```

### Testing Failure & Retry

1. Set an invalid YouTube API key in `.env`
2. Save a YouTube link
3. Observe: status goes `pending → processing → pending` (retry)
4. After 3 retries: status becomes `failed`, `enrichmentError` has the error message

### Testing Crash Recovery

1. Save a few links
2. Kill the server while items are in `processing` state
3. Restart the server
4. Watch logs for: `Reset N stale processing documents to pending`
5. Items will be re-processed normally

---

## Future Roadmap

1. **Frontend metadata display** — Show thumbnails, descriptions, view counts, article previews in Card component
2. **Postgres + pgvector migration** — Move from MongoDB to Postgres with vector embeddings on `fullText`
3. **Semantic search** — Use embeddings to find similar content across a user's saved items
4. **AI Q&A** — RAG pipeline: query → vector search → LLM answer with citations
5. **Auto-tagging** — Use extracted metadata (tags, topics, categories) to auto-suggest tags
6. **Re-enrichment** — Periodic refresh of metadata for content that changes (e.g., view counts)
7. **Webhook triggers** — Notify frontend when enrichment completes (replace polling with push)
8. **Rate limiting** — Per-API rate limit tracking to stay within free-tier quotas
