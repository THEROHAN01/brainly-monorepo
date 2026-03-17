# Testing Strategy

## Overview

Brainly uses **Vitest** as the test runner across both backend and frontend. Backend integration tests run against an in-memory MongoDB instance (`mongodb-memory-server`), and HTTP endpoints are tested via `supertest`. Frontend tests run in a `jsdom` environment.

CI runs automatically on push/PR to `main` via GitHub Actions (`.github/workflows/ci.yml`).

## Running Tests

```bash
# Backend — all tests
cd backend && npm test

# Backend — watch mode (re-runs on file changes)
cd backend && npm run test:watch

# Backend — single file
cd backend && npx vitest run src/__tests__/auth.test.ts

# Frontend — all tests
cd frontend && npm test

# Frontend — watch mode
cd frontend && npm run test:watch
```

## Test Architecture

### Backend

| Component | File | What it tests | Type |
|-----------|------|---------------|------|
| Providers | `src/__tests__/providers.test.ts` | URL parsing for YouTube, Twitter, generic links; `isValidUrl` | Unit (pure functions) |
| Auth | `src/__tests__/auth.test.ts` | Signup validation, signin, JWT middleware (valid/invalid/missing tokens) | Integration (HTTP + DB) |
| Content | `src/__tests__/content.test.ts` | Create (YouTube/Twitter/generic), read with pagination, delete, ownership isolation | Integration (HTTP + DB) |
| Share | `src/__tests__/share.test.ts` | Create share link, reuse hash, revoke, public access, 404 after revoke | Integration (HTTP + DB) |

**Key details:**

- **In-memory MongoDB**: `mongodb-memory-server` spins up a disposable MongoDB per test run. No external DB needed.
- **Setup file** (`src/__tests__/setup.ts`): Sets env vars at the top level (before module imports), connects to in-memory DB, clears all collections between tests via `afterEach`.
- **App export**: `src/index.ts` exports `app` for supertest. The `main()` function (which calls `connectDB` + `app.listen`) is guarded by `if (!process.env.VITEST)` so it doesn't run during tests.
- **Rate limiting**: Rate limiters use `max: 10000` when `VITEST` is set so tests aren't blocked by rate limits.
- **Test isolation**: `afterEach` clears all DB collections. Tests that need users must create them in `beforeEach`, not `beforeAll`.

### Frontend

| Component | File | What it tests | Type |
|-----------|------|---------------|------|
| Providers | `src/__tests__/providers.test.ts` | `parseUrl`, `quickValidateUrl`, `isValidUrl` across all provider types | Unit |
| API | `src/__tests__/api.test.ts` | Axios instance config, baseURL, auth/config mocking | Unit |

**Key details:**

- **Environment**: `jsdom` (configured in `vite.config.ts`)
- **Mocking**: `vi.mock()` for `lib/auth` and `config` modules
- **No setup file needed** — frontend tests are pure unit tests with no external dependencies

## Writing New Tests

### Backend integration test template

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';

let token: string;

// Recreate user before each test (afterEach clears DB)
beforeEach(async () => {
    await request(app)
        .post('/api/v1/signup')
        .send({ username: 'myuser', password: 'password123' });

    const res = await request(app)
        .post('/api/v1/signin')
        .send({ username: 'myuser', password: 'password123' });

    token = res.body.token;
});

describe('my endpoint', () => {
    it('does the thing', async () => {
        const res = await request(app)
            .get('/api/v1/some-endpoint')
            .set({ Authorization: `Bearer ${token}` });

        expect(res.status).toBe(200);
    });
});
```

### Frontend unit test template

```ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../path/to/module';

describe('myFunction', () => {
    it('returns expected result', () => {
        expect(myFunction('input')).toBe('output');
    });
});
```

### Important rules

1. **Use `beforeEach` for DB-dependent setup**, not `beforeAll`. The `afterEach` in `setup.ts` clears all collections.
2. **Don't import `connectDB`** in tests — the setup file handles the connection.
3. **Don't call `app.listen()`** — supertest handles request routing without a running server.
4. **Test from the backend directory**: `cd backend && npx vitest run`. Running from the monorepo root will skip the setup file.

## What's Tested vs. Not Tested

### Currently tested (78 tests)
- URL parsing for all provider types (YouTube, Twitter, generic)
- User signup input validation (username length, format, password length, duplicates)
- User signin (valid credentials, wrong password, nonexistent user)
- JWT middleware (missing header, invalid token, malformed header, valid token)
- Content CRUD (create with auto-type-detection, read with pagination, delete)
- Content ownership isolation (users can't see or delete other users' content)
- Share brain flow (create, reuse, revoke, public access, 404 after revoke)
- Frontend provider parsing and validation

### Not yet tested (future additions)
- **Tags**: Create, delete, update on content, duplicate handling
- **Google OAuth**: Token verification, account linking, new user creation
- **Extractors**: Metadata extraction (mock external HTTP with `msw`)
- **Enrichment service**: Polling, per-user fairness, retry logic
- **Rate limiting**: Verify limits are enforced in production mode
- **Frontend components**: CreateContentModal, Card, Dashboard (use `@testing-library/react`)
- **Frontend hooks**: useContents, useUser, useTags (use `@testing-library/react`)
- **E2E**: Full user flows with Playwright (signup → add content → share)

## CI Pipeline

`.github/workflows/ci.yml` runs on push and PR to `main`:

| Job | Steps |
|-----|-------|
| **backend** | `npm ci` → `tsc --noEmit` → `npm test` |
| **frontend** | `npm ci` → `eslint` → `tsc --noEmit` → `npm test` |

Both jobs run in parallel on `ubuntu-latest` with Node 20.

## Tech Stack

- **Vitest 4** — test runner (both backend and frontend)
- **mongodb-memory-server** — in-memory MongoDB for backend integration tests
- **supertest** — HTTP assertions for Express endpoints
- **jsdom** — browser environment simulation for frontend tests
