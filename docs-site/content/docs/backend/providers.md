---
title: Provider System
description: URL parsing and platform detection — the synchronous, zero-I/O classification layer.
---

The provider system (`src/providers/`) is a plugin-based system for parsing URLs
and detecting which platform they belong to. It is **mirrored in the frontend**
(`frontend/src/providers/`) for instant client-side validation without a
round-trip.

## Interfaces (`base.ts`)

```ts
interface ContentProvider {
  type: string              // 'youtube', 'twitter', etc.
  displayName: string       // 'YouTube', 'Twitter/X', etc.
  hostnames: string[]       // domains this provider handles
  supportsEmbed: boolean
  embedType: EmbedType      // 'iframe' | 'oembed' | 'card' | 'none'
  canHandle(url: URL): boolean
  extractId(url: URL): string | null
  getEmbedUrl?(id: string): string
  getCanonicalUrl(id: string): string
}

type EmbedType = 'iframe' | 'oembed' | 'card' | 'none'

interface ParsedContent {
  type: string
  displayName: string
  contentId: string
  originalUrl: string
  embedUrl?: string
  canonicalUrl: string
  canEmbed: boolean
  embedType: EmbedType
}
```

## Registry (`index.ts`)

- Registers providers conditionally based on `config.providers.*` flags.
- The `generic` provider is always registered as the fallback.
- `parseUrl(rawUrl)` — main entry point. Returns `ParsedContent | null`.
- `getProvider(type)` — look up a provider by type string.
- `getProviderInfo()` — returns all active providers (used by `/api/v1/content/providers`).
- `isValidUrl(url)` — basic http/https check.

## Providers at a glance

| File | Type | Hostnames | Embed | ID extraction |
| --- | --- | --- | --- | --- |
| `youtube.provider.ts` | `youtube` | youtube.com, youtu.be, m.youtube.com | `iframe` | From `/watch?v=`, `/shorts/`, `/live/`, `/embed/`, youtu.be path |
| `twitter.provider.ts` | `twitter` | twitter.com, x.com, mobile.twitter.com | `oembed` | Numeric tweet ID from `/{user}/status/{id}` |
| `instagram.provider.ts` | `instagram` | instagram.com, m.instagram.com | `oembed` | Base64url shortcode from `/p/`, `/reel/`, `/tv/` |
| `github.provider.ts` | `github` | github.com, gist.github.com | `card` | `owner/repo`, issue/PR numbers, gist IDs; filters non-repo pages |
| `medium.provider.ts` | `medium` | medium.com, *.medium.com | `card` | 10–12 char hex ID from `/p/` or slug tail |
| `notion.provider.ts` | `notion` | notion.so, notion.site | `card` | 32-char hex UUID from page slug |
| `generic.provider.ts` | `link` | any http/https | `card` | MD5 hash of full URL (12 chars) |

## Per-provider URL parsing reference

### YouTube

| Property | Value |
| --- | --- |
| Hostnames | `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be` |
| ID regex | `/^[a-zA-Z0-9_-]{11}$/` (exactly 11 chars) |
| URL formats | `/watch?v=`, `youtu.be/`, `/shorts/`, `/live/`, `/embed/`, `/v/` |
| embedType | `iframe` |
| Embed URL | `https://www.youtube.com/embed/{contentId}` |

### Twitter

| Property | Value |
| --- | --- |
| Hostnames | `twitter.com`, `x.com` (+ www/mobile variants) |
| ID regex | `/^\d{1,19}$/` (Snowflake IDs) |
| Path format | `/{username}/status/{tweetId}` |
| embedType | `oembed` |

### Instagram

| Property | Value |
| --- | --- |
| Hostnames | `instagram.com`, `www.instagram.com`, `m.instagram.com` |
| Shortcode | `/^[a-zA-Z0-9_-]{8,14}$/` |
| Path formats | `/p/`, `/reel/`, `/tv/` |
| embedType | `oembed` |
| Embed URL | `https://www.instagram.com/p/{contentId}/embed` |

### GitHub

| Property | Value |
| --- | --- |
| Hostnames | `github.com`, `gist.github.com` |
| embedType | `card` (no embed support) |
| ID formats | `owner/repo`, `owner/repo/issues/N`, `owner/repo/pull/N`, `gist/user/id` |
| Blocked | settings, marketplace, explore, topics, trending, login, signup, etc. |

### Medium

| Property | Value |
| --- | --- |
| Hostnames | `medium.com`, `*.medium.com` |
| ID regex | `/^[a-f0-9]{10,12}$/i` |
| Extraction | Short link `/p/{id}` or trailing `-{hexId}` on slug |
| embedType | `card` |

### Notion

| Property | Value |
| --- | --- |
| Hostnames | `notion.so`, `notion.site`, `*.notion.site` |
| ID format | 32-char hex UUID (dashes stripped on storage) |
| embedType | `card` |

> **Note:** the Notion provider flag is currently disabled in config because no
> extractor exists yet — see the [Functionality Fixes](/docs/changelog/functionality-fixes)
> log.

### Generic (fallback)

| Property | Value |
| --- | --- |
| Matches | Any `http:` or `https:` URL (always last in registry) |
| contentId | MD5 hash of `url.href`, truncated to 12 characters |
| embedType | `card` |

## Frontend mirror

`frontend/src/providers/` contains exact mirrors of these implementations so the
`CreateContentModal` can validate and classify URLs instantly. It exports
`parseUrl`, `quickValidateUrl`, `isValidUrl`, `getEmbedUrl`, and
`getCanonicalUrl` — the same 7 providers as the backend. See the
[frontend provider mirror](/docs/frontend/providers-and-lib).
