---
title: Lib, Providers & Types
description: The Axios instance, auth helpers, the client-side provider mirror, icons, and shared types.
---

## Lib utilities (`src/lib/`)

### api.ts

A pre-configured Axios instance:

- `baseURL`: `config.BACKEND_URL`.
- **Request interceptor:** reads the token via `getToken()` and sets
  `Authorization: Bearer <token>` on every request.
- **Response interceptor:** on a `401`, calls `removeToken()` and redirects to
  `/signin` (guarded by an `isRedirecting` flag so only the first 401 navigates).

### auth.ts

Token management via `localStorage`:

```ts
getToken()              // returns stored JWT or null
setToken(token: string) // saves to localStorage
removeToken()           // clears from localStorage
getAuthHeaders()        // returns { Authorization: 'Bearer <token>' }
```

### utils.ts

`cn(...classes)` — combines class strings with `clsx` + `tailwind-merge` to handle
Tailwind class conflicts.

## Provider mirror (`src/providers/`)

Exact mirrors of the backend provider implementations, so the
`CreateContentModal` can validate and classify URLs instantly without a
round-trip. Exports:

- `parseUrl(rawUrl)` — same as backend.
- `quickValidateUrl(url)` — fast check used in the modal input.
- `isValidUrl(url)` — http/https check.
- `getEmbedUrl(type, contentId)` — generate embed URL client-side.
- `getCanonicalUrl(type, contentId)` — canonical URL.

Same 7 providers as the backend: youtube, twitter, instagram, github, medium,
notion, generic. `config/providers.ts` holds the frontend provider feature flags,
mirroring `backend/src/config.ts`. See the
[backend provider system](/docs/backend/providers) for parsing details.

## Icons (`src/icons/`)

Each icon is a React SVG component accepting `size` (`sm`/`md`/`lg`) and
`className`, re-exported from `icons/index.ts`. Includes `Logo`, the seven
provider icons (`YouTubeIcon`, `TwitterIcon`, `InstagramIcon`, `GithubIcon`,
`MediumIcon`, `NotionIcon`, `GlobeIcon`), and UI icons (`PlusIcon`, `ShareIcon`,
`SearchIcon`, `TrashIcon`, `TagIcon`, `CrossIcon`, `FolderIcon`, `ShieldIcon`,
`ZapIcon`, `StarIcon`, `UsersIcon`, `CheckIcon`, `CopyIcon`, `ArrowRightIcon`).

## Types & config

```ts
// types/tag.ts
interface Tag {
  _id: string
  name: string
  userId: string
  createdAt: string
}
```

`config/providers.ts` — frontend provider config flags mirroring
`backend/src/config.ts`, used to conditionally register providers in the frontend
registry.

## Frontend integration status

The frontend **does not yet consume enrichment metadata**. `Card.tsx` renders
content based on provider data only (type, embedUrl, contentId). The enriched
`metadata` object is stored in MongoDB and returned by `GET /api/v1/content`, but
is **not yet rendered**. Displaying it (thumbnails, descriptions, view counts,
article previews) is on the [roadmap](/docs/roadmap/ai-phase-design).
