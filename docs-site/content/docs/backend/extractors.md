---
title: Extractor System
description: Background metadata fetchers — one per platform — and the safe-fetch layer.
---

Extractors (`src/extractors/`) are background metadata fetchers, one per content
platform. They're called by the [enrichment service](/docs/backend/enrichment-service)
after content is saved. They run on the backend only.

## Interfaces (`base.ts`)

```ts
interface ContentExtractor {
  type: string
  displayName: string
  isConfigured(): boolean    // returns false if a required API key is missing
  extract(url: string, contentId: string): Promise<ExtractedMetadata>
}

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
    duration: number;   // seconds
  }>;

  // Provider-specific structured data (varies per extractor)
  providerData?: Record<string, any>;

  // Extraction audit trail
  extractedAt: Date;
  extractorVersion: string;
}
```

## Registry (`registry.ts`)

A static array of the six extractors (youtube, twitter, instagram, github,
medium, generic). There is no Notion extractor.

- `getExtractor(type)` — returns the matching extractor, or the **generic
  extractor as a fallback** for any unmatched type.
- `isExtractorConfigured(type)` — returns `getExtractor(type).isConfigured()`,
  i.e. false when a required API key is absent, so the content gets `skipped`
  status instead of erroring.

## Safe fetch (`safe-fetch.ts`)

All external HTTP in the extractor layer goes through `safeFetch()`. See
[Security](/docs/backend/security#ssrf-protection--safe-fetch) for the full SSRF
detail. Signature:

```ts
interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;         // Default: 15,000ms
  maxBodyBytes?: number;      // Default: 5MB
  skipSsrfCheck?: boolean;    // true for known-safe API domains
}

async function safeFetch(url: string, options?: SafeFetchOptions): Promise<Response>;
async function safeFetchText(url, options?): Promise<{ response: Response; text: string }>;
async function safeFetchJson<T>(url, options?): Promise<{ response: Response; data: T }>;
```

## HTML utilities (`html-utils.ts`)

`stripHtml(html)` converts `<br>` to `\n`, `</p>` to `\n\n`, strips all tags,
decodes HTML entities, and collapses 3+ newlines to 2.

## Per-extractor reference

### YouTube

| Property | Value |
| --- | --- |
| API | `https://www.googleapis.com/youtube/v3/videos` |
| Parts fetched | `snippet, contentDetails, statistics, topicDetails, status` |
| Requires key | Yes — `YOUTUBE_API_KEY` (free: 10,000 units/day). Without it, `isConfigured()` is false and YouTube content is `skipped`. |
| Transcript | Innertube player API (no extra key) — used inside the extractor once it runs |
| fullTextType | `transcript` |
| Transcript format | Both timestamped segments AND concatenated plain text |

**providerData:** `channelId`, `categoryId`, `duration` (ISO 8601), `definition`,
`captionAvailable`, `viewCount`, `likeCount`, `commentCount`, `topicCategories`,
`liveBroadcastContent`, `license`, `embeddable`.

Transcript fetch failures are non-fatal — logged as a warning; enrichment
continues with API metadata only. Segment `start`/`duration` come straight from
the caption track (already in seconds) via `parseFloat` — no unit conversion is
applied.

### Twitter

| Property | Value |
| --- | --- |
| API | `https://publish.twitter.com/oembed` (free, no key) |
| Requires key | No |
| fullTextType | `plain` |

Parses `<p>` content from the embed HTML via `/<p[^>]*>([\s\S]*?)<\/p>/i`, then
strips tags and decodes entities. **providerData:** `embedHtml`, `oembedUrl`.

### Instagram

| Property | Value |
| --- | --- |
| Method | OG meta tag scraping via `safeFetchText` |
| Requires key | No |
| User-Agent | `Mozilla/5.0 (compatible; Brainly/1.0)` |
| fullTextType | `plain` |

Extracts `og:title`, `og:description`, `og:image`, `og:type`, `og:site_name`.
Author via `/^(.+?)\s+on\s+Instagram/i`; hashtags via `/#[a-zA-Z0-9_]+/g`. Throws
if nothing was extracted (Instagram likely blocked the request).
**providerData:** `mediaType`, `siteName`.

### GitHub

| Property | Value |
| --- | --- |
| API | `https://api.github.com` REST API |
| Requires key | No (recommended — 60 req/hr without, 5,000 with) |
| Auth header | `Authorization: Bearer {GITHUB_TOKEN}` if configured |

Resource detection via `contentId` format: `gist/*` → gist endpoint; contains
`/issues/`, `/pull/`, `/discussions/` → issues endpoint; everything else → repos
endpoint.

| Resource | fullTextType | fullText content |
| --- | --- | --- |
| Repository | `markdown` | Full README.md content |
| Issue/PR | `plain` | Full issue/PR body |
| Gist | `plain` | All file contents as fenced code blocks |

README is base64-decoded via `Buffer.from(content, 'base64').toString('utf-8')`.
Issue descriptions truncated to 500 chars (full body in `fullText`).
`providerData.resourceType` is `repository`, `pull_request`, `issue`, or `gist`.
Uses `skipSsrfCheck: true` since `api.github.com` is known-safe.

### Medium

| Property | Value |
| --- | --- |
| Library | `@extractus/article-extractor` (dynamic ESM import) |
| Requires key | No |
| fullTextType | `article` |

`@extractus/article-extractor` is ESM-only but the backend is CommonJS — resolved
with a dynamic `import()`:

```ts
const { extract } = await import('@extractus/article-extractor');
```

`fullText` is `stripHtml(article.content)`. **providerData:** `source`, `ttr`
(time-to-read seconds), `favicon`, `type`.

### Generic

| Property | Value |
| --- | --- |
| type | `link` (matches the generic provider) |
| Requires key | No |
| fullTextType | `article` |

Two-stage strategy: (1) `@extractus/article-extractor` on the full URL, then
(2) OG meta tag scraping fallback. **Never throws** — returns minimal metadata
even if both strategies fail, so generic links always reach `enriched`. Full SSRF
check applied (user-supplied arbitrary URLs).
