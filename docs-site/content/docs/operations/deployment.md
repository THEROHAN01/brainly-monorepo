---
title: Deployment
description: Deploying the backend, frontend, and documentation site to production.
---

Brainly's three deployable units are independent. Each can ship to a different
host.

## Backend (Express API)

The backend compiles to `dist/` and runs as a long-lived Node process.

```bash
cd backend
npm ci
npm run build      # tsc → dist/
npm run start      # node dist/index.js
```

**Production environment** (see [Environment Variables](/docs/getting-started/environment-variables)):

- `MONGO_URI` — a production MongoDB (e.g. MongoDB Atlas).
- `JWT_SECRET` — a strong secret (`openssl rand -base64 32`).
- `CORS_ORIGIN` — the deployed frontend origin (not `localhost`).
- `GOOGLE_CLIENT_ID` — matching the frontend.
- Optional extractor keys: `YOUTUBE_API_KEY`, `GITHUB_TOKEN`, etc.

**Behind a reverse proxy / load balancer:** set `app.set('trust proxy', 1)` so
rate limiting reads the real client IP from `X-Forwarded-For`, and swap the
in-memory rate-limit store for `rate-limit-redis` if you run more than one
instance. See [Security → Production considerations](/docs/backend/security#production-considerations).

The enrichment service runs in-process and is safe across multiple instances
thanks to its atomic-claim design.

## Frontend (Vite SPA)

The frontend builds to static assets that can be served from any static host or
CDN.

```bash
cd frontend
npm ci
npm run build      # → dist/
```

Set build-time env vars before `npm run build`:

- `VITE_BACKEND_URL` — the deployed backend URL.
- `VITE_GOOGLE_CLIENT_ID` — matching the backend.

Serve `dist/` as static files. Configure your host to rewrite unknown routes to
`index.html` (SPA fallback) so client-side routes like `/dashboard` and
`/share/:hash` work on refresh.

## Documentation site (this site)

The docs site is a Next.js 16 app — see [Deploy this site to Vercel](#deploy-this-site-to-vercel)
below.

## Deploy this site to Vercel

The docs site lives in `docs-site/` inside the monorepo.

1. Import the repository in Vercel.
2. Set **Root Directory** to `docs-site` (Vercel auto-detects Next.js — leave the
   build command and output as defaults).
3. Set the **Node.js version** to **22.x** (the project pins `engines.node >= 22`
   and ships a `.nvmrc`).
4. No environment variables are required. The `postinstall` hook runs
   `fumadocs-mdx` to generate the content index automatically.
5. Deploy. Vercel gives every PR a Preview Deployment.

No `vercel.json` is needed. Setting the Root Directory scopes the build to
`docs-site/`, so changes to `backend/`/`frontend/` won't trigger unrelated docs
builds if you also add an `ignoreCommand`.
