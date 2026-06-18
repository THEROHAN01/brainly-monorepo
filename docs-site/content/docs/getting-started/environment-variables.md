---
title: Environment Variables
description: Every environment variable used by the backend and frontend.
---

## Backend (`backend/.env`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret key for signing JWTs (use `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Yes* | — | Google OAuth client ID (*required for Google sign-in) |
| `PORT` | No | `5000` | HTTP server port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error` |
| `YOUTUBE_API_KEY` | No* | — | YouTube Data API v3 key. *Without it, the YouTube extractor reports as unconfigured and YouTube content is marked `skipped` (never enriched). Innertube is only used **inside** the extractor to fetch transcripts once it runs. |
| `GITHUB_TOKEN` | No | — | GitHub PAT (unauthenticated: 60 req/hr vs 5000 with token) |
| `TWITTER_BEARER_TOKEN` | No | — | Twitter API bearer token |
| `INSTAGRAM_APP_ID` | No | — | Instagram app ID |

**API key behavior:** if an API key is missing, the corresponding extractor's
`isConfigured()` returns `false`, and the enrichment service marks those content
items as `skipped`. The system degrades gracefully — it never crashes due to
missing optional keys.

## Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_BACKEND_URL` | No | `http://localhost:3000` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Yes* | — | Google OAuth client ID (must match backend) |

The frontend reads these via `import.meta.env` in `src/config.ts` as two named
exports:

```ts
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
```

> **Port mismatch to watch for:** the frontend's `VITE_BACKEND_URL` default is
> `http://localhost:3000`, but the backend's own `PORT` default is `5000`. If you
> rely on defaults, set `VITE_BACKEND_URL=http://localhost:5000` (or start the
> backend on `PORT=3000`) so the SPA targets the right port.
