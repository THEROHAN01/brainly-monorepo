---
title: CI/CD
description: The GitHub Actions pipeline that gates every push and PR to main.
---

## `.github/workflows/ci.yml`

Triggered on push or pull request to `main`. Two jobs run in parallel,
independently, on `ubuntu-latest` with Node 20.

### Backend job

1. Checkout.
2. Node 20 setup with npm cache for `backend/`.
3. `cd backend && npm ci`.
4. `npx tsc --noEmit` — TypeScript type check.
5. `npm test` — runs all Vitest integration tests.

### Frontend job

1. Checkout.
2. Node 20 setup with npm cache for `frontend/`.
3. `cd frontend && npm ci`.
4. `npm run lint` — ESLint.
5. `npx tsc --noEmit` — TypeScript type check.
6. `npm test` — runs all Vitest unit tests.

## Key end-to-end flows

A few flows worth keeping in mind when reasoning about deployments.

### Saving a YouTube video

1. User pastes a YouTube URL into `CreateContentModal`.
2. Frontend `quickValidateUrl()` detects the `youtube` type instantly.
3. `POST /api/v1/content` — backend `parseUrl()` extracts the `contentId`, creates
   `Content` with `enrichmentStatus: 'pending'`.
4. Within 30s, the enrichment service calls the YouTube Data API + Innertube
   transcript API, then sets `enrichmentStatus: 'enriched'`.
5. The dashboard renders an `<iframe>` embed.

### Sharing a brain

1. User clicks "Share Brain".
2. `POST /api/v1/brain/share { share: true }` creates a `Link { hash, userId }`.
3. The frontend copies `https://<origin>/share/<hash>` to the clipboard.
4. Visitors hit `GET /api/v1/brain/<hash>` and see a read-only grid.

### Google OAuth sign-in

1. User clicks "Continue with Google"; the popup returns a credential token.
2. `POST /api/v1/auth/google { credential }` verifies it with `OAuth2Client`.
3. First time → creates a user; existing email → links the Google ID.
4. Backend returns its own 7-day JWT; the frontend stores it and navigates to
   `/dashboard`.
