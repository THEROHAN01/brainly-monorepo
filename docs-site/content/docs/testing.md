---
title: Testing
description: The Vitest-based testing strategy across backend and frontend.
icon: FlaskConical
---

Brainly uses **Vitest** as the test runner across both backend and frontend.
Backend integration tests run against an in-memory MongoDB (`mongodb-memory-server`),
and HTTP endpoints are tested via `supertest`. Frontend tests run in a `jsdom`
environment. CI runs automatically on push/PR to `main` via GitHub Actions.

## Running tests

```bash
# Backend — all tests
cd backend && npm test

# Backend — watch mode
cd backend && npm run test:watch

# Backend — single file
cd backend && npx vitest run src/__tests__/auth.test.ts

# Frontend — all tests
cd frontend && npm test

# Frontend — watch mode
cd frontend && npm run test:watch
```

## Backend test architecture

| Component | File | What it tests | Type |
| --- | --- | --- | --- |
| Providers | `src/__tests__/providers.test.ts` | URL parsing for YouTube, Twitter, generic; `isValidUrl` | Unit |
| Auth | `src/__tests__/auth.test.ts` | Signup validation, signin, JWT middleware | Integration |
| Content | `src/__tests__/content.test.ts` | Create, read+pagination, delete, ownership isolation | Integration |
| Share | `src/__tests__/share.test.ts` | Create, reuse hash, revoke, public access, 404 after revoke | Integration |

**Key details:**

- **In-memory MongoDB** — `mongodb-memory-server` spins up a disposable MongoDB
  per test run. No external DB needed.
- **Setup file** (`src/__tests__/setup.ts`) — sets env vars at the top level
  (before module imports), connects to the in-memory DB, clears all collections
  between tests via `afterEach`.
- **App export** — `src/index.ts` exports `app` for supertest. `main()` is guarded
  by `if (!process.env.VITEST)` so it doesn't run during tests.
- **Rate limiting** — limiters use `max: 10000` when `VITEST` is set.
- **Test isolation** — `afterEach` clears all DB collections; create users in
  `beforeEach`, not `beforeAll`.

## Frontend test architecture

| Component | File | What it tests | Type |
| --- | --- | --- | --- |
| Providers | `src/__tests__/providers.test.ts` | `parseUrl`, `quickValidateUrl`, `isValidUrl` | Unit |
| API | `src/__tests__/api.test.ts` | Axios instance config, interceptors | Unit |

**Key details:** environment is `jsdom` (configured in `vite.config.ts`);
`vi.mock()` mocks `lib/auth` and `config`; no setup file needed.

## Writing new tests

### Backend integration test template

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';

let token: string;

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

### Important rules

1. Use `beforeEach` for DB-dependent setup, not `beforeAll`.
2. Don't import `connectDB` in tests — the setup file handles the connection.
3. Don't call `app.listen()` — supertest routes requests without a running server.
4. Test from the backend directory: `cd backend && npx vitest run`. Running from
   the monorepo root skips the setup file.

## Coverage (78 tests)

**Tested:** URL parsing for all provider types; signup validation; signin; JWT
middleware; content CRUD with auto-type-detection, pagination, and ownership
isolation; the full share-brain flow; frontend provider parsing and the Axios
interceptors.

**Not yet tested:** tags CRUD; Google OAuth; extractors (mock HTTP with `msw`);
the enrichment service; rate limiting in production mode; frontend components and
hooks (`@testing-library/react`); end-to-end flows (Playwright).

## CI pipeline

`.github/workflows/ci.yml` runs on push and PR to `main`:

| Job | Steps |
| --- | --- |
| **backend** | `npm ci` → `tsc --noEmit` → `npm test` |
| **frontend** | `npm ci` → `eslint` → `tsc --noEmit` → `npm test` |

Both jobs run in parallel on `ubuntu-latest` with Node 20.
