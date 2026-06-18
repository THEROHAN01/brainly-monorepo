---
title: Troubleshooting
description: Common setup and runtime issues, and how to resolve them.
icon: Wrench
---

Solutions to the failure modes you're most likely to hit. For environment
variables referenced below, see [Environment Variables](/docs/getting-started/environment-variables).

## The frontend can't reach the backend (network errors, CORS)

Two distinct causes:

- **Port mismatch.** The frontend's `VITE_BACKEND_URL` defaults to
  `http://localhost:3000`, but the backend's `PORT` defaults to `5000`. Set
  `VITE_BACKEND_URL=http://localhost:5000` (or start the backend with `PORT=3000`).
- **CORS blocked.** The backend only allows the origin in `CORS_ORIGIN` (default
  `http://localhost:5173`). If your frontend runs on a different origin, update
  `CORS_ORIGIN` to match.

## Saved content never gets metadata (stuck `pending` or `skipped`)

- **`skipped`** means no configured extractor for that type. The most common case
  is YouTube without `YOUTUBE_API_KEY` — set the key and re-save. Notion is
  permanently `skipped` because its provider is disabled (no extractor).
- **Stuck `pending`** usually means the enrichment service isn't running. Confirm
  the boot log shows `Enrichment service started` and that
  `config.extractors.enabled` is `true`.
- **`failed`** means all 3 retries were exhausted; check `enrichmentError` on the
  document for the underlying API error.

See the [Enrichment Pipeline](/docs/architecture/enrichment-pipeline) for the full
state machine.

## `429 Too Many Requests`

You hit a [rate limit](/docs/backend/security#rate-limiting): 10/15min on auth
endpoints, 30/15min on content creation, 100/15min globally per IP. Wait for the
window to reset (see the `RateLimit-Reset` response header). Limits are relaxed
automatically under `VITEST` so they won't block tests.

## `401 Unauthorized` on every protected request

The JWT is missing, malformed, or expired (tokens last 7 days). The frontend's
Axios interceptor clears the token and redirects to `/signin` on a `401` — sign
in again to get a fresh token.

## Google sign-in returns `503`

`GOOGLE_CLIENT_ID` is not set on the backend. It must be configured and must match
the frontend's `VITE_GOOGLE_CLIENT_ID`.

## Backend exits immediately on boot

`connectDB()` throws on a missing/invalid `MONGO_URI`, and `JWT_SECRET` is
required. Check both are set in `backend/.env`. For local MongoDB, run
`docker compose up -d` from the repo root.

## Docs site: `npm run build` fails

- **Node version** — the docs site requires **Node 22+**. Run `fnm use 22` (or
  `nvm use 22`) before building; the app packages target Node 20.
- **`Language 'env' not found`** — Shiki has no `env` highlighter. Use ` ```bash `
  for `.env` snippets in MDX.
- **`Can't resolve '@/.source'`** — run `npx fumadocs-mdx` to regenerate the
  source index (it also runs on `postinstall`).
