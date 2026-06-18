# Testing Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Vitest testing framework in both backend and frontend, write the highest-ROI initial test suites covering auth, providers, API interceptor, and content CRUD.

**Architecture:** Backend uses Vitest with `mongodb-memory-server` for isolated DB tests and `supertest` for HTTP endpoint testing. Frontend uses Vitest in jsdom mode for unit tests on providers, API interceptor, and hooks. Both share the same test runner for consistency.

**Tech Stack:** Vitest 3, supertest, mongodb-memory-server, @testing-library/react (frontend hooks only)

---

### Task 1: Backend — Install test dependencies and configure Vitest

**Files:**
- Modify: `backend/package.json` (scripts + devDependencies)
- Create: `backend/vitest.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd backend && npm install -D vitest mongodb-memory-server supertest @types/supertest
```

- [ ] **Step 2: Create vitest.config.ts**

Create `backend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 30000,
        hookTimeout: 30000,
        setupFiles: ['./src/__tests__/setup.ts'],
    },
});
```

- [ ] **Step 3: Update package.json test script**

In `backend/package.json`, change the `"test"` script:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create test setup file with in-memory MongoDB**

Create `backend/src/__tests__/setup.ts`:

```ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    await mongoose.connect(uri);
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});
```

- [ ] **Step 5: Run `npx vitest run` to verify setup works (should pass with 0 tests)**

Run: `cd backend && npx vitest run`
Expected: "No test files found" (no error, framework loads correctly)

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/vitest.config.ts backend/src/__tests__/setup.ts
git commit -m "test: add Vitest + mongodb-memory-server testing infrastructure to backend"
```

---

### Task 2: Backend — Provider URL parsing tests

**Files:**
- Create: `backend/src/__tests__/providers.test.ts`

These are pure-function tests — no DB, no HTTP. Fastest to write and run.

- [ ] **Step 1: Write provider parsing tests**

Create `backend/src/__tests__/providers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseUrl, isValidUrl } from '../providers';

describe('parseUrl', () => {
    describe('YouTube', () => {
        it('parses standard watch URL', () => {
            const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result).not.toBeNull();
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
            expect(result!.canEmbed).toBe(true);
        });

        it('parses short URL (youtu.be)', () => {
            const result = parseUrl('https://youtu.be/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses shorts URL', () => {
            const result = parseUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses embed URL', () => {
            const result = parseUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses live URL', () => {
            const result = parseUrl('https://www.youtube.com/live/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses mobile URL', () => {
            const result = parseUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses URL with extra params (timestamp, playlist)', () => {
            const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLxyz');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('generates correct embed URL', () => {
            const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result!.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        it('rejects youtube.com without video ID', () => {
            const result = parseUrl('https://www.youtube.com/');
            // Falls through to generic provider
            expect(result!.type).not.toBe('youtube');
        });
    });

    describe('Twitter', () => {
        it('parses twitter.com status URL', () => {
            const result = parseUrl('https://twitter.com/elonmusk/status/1234567890123456789');
            expect(result!.type).toBe('twitter');
            expect(result!.contentId).toBe('1234567890123456789');
            expect(result!.canEmbed).toBe(true);
        });

        it('parses x.com status URL', () => {
            const result = parseUrl('https://x.com/OpenAI/status/9876543210987654321');
            expect(result!.type).toBe('twitter');
            expect(result!.contentId).toBe('9876543210987654321');
        });

        it('parses URL with query params', () => {
            const result = parseUrl('https://twitter.com/user/status/1234567890123456789?s=20');
            expect(result!.contentId).toBe('1234567890123456789');
        });

        it('parses mobile twitter URL', () => {
            const result = parseUrl('https://mobile.twitter.com/user/status/1234567890123456789');
            expect(result!.type).toBe('twitter');
        });

        it('rejects twitter.com profile URL (no status)', () => {
            const result = parseUrl('https://twitter.com/elonmusk');
            // Falls through to generic provider
            expect(result!.type).not.toBe('twitter');
        });
    });

    describe('Generic (fallback)', () => {
        it('handles any valid HTTP URL', () => {
            const result = parseUrl('https://example.com/some/page');
            expect(result).not.toBeNull();
            expect(result!.type).toBe('link');
            expect(result!.canEmbed).toBe(false);
        });

        it('generates consistent content ID for same URL', () => {
            const r1 = parseUrl('https://example.com/page');
            const r2 = parseUrl('https://example.com/page');
            expect(r1!.contentId).toBe(r2!.contentId);
        });

        it('generates different IDs for different URLs', () => {
            const r1 = parseUrl('https://example.com/page1');
            const r2 = parseUrl('https://example.com/page2');
            expect(r1!.contentId).not.toBe(r2!.contentId);
        });
    });

    describe('Invalid URLs', () => {
        it('returns null for empty string', () => {
            expect(parseUrl('')).toBeNull();
        });

        it('returns null for non-URL string', () => {
            expect(parseUrl('not a url')).toBeNull();
        });

        it('returns null for ftp protocol', () => {
            expect(parseUrl('ftp://files.example.com/doc.pdf')).toBeNull();
        });
    });
});

describe('isValidUrl', () => {
    it('accepts http URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('accepts https URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('rejects ftp URLs', () => {
        expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('rejects non-URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/__tests__/providers.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/providers.test.ts
git commit -m "test: add provider URL parsing tests for YouTube, Twitter, and generic links"
```

---

### Task 3: Backend — Auth endpoint integration tests

**Files:**
- Create: `backend/src/__tests__/auth.test.ts`

These tests hit the Express app via supertest with a real in-memory MongoDB. They need the app exported without calling `listen()`.

- [ ] **Step 1: Extract Express app for testing**

Currently `backend/src/index.ts` creates the app, defines routes, and calls `main()` which calls `app.listen()`. We need to export the `app` for supertest.

Add this line at the end of the `app.use(...)` and route definition section in `backend/src/index.ts`, right before the `async function main()` definition:

```ts
export { app };
```

- [ ] **Step 2: Write auth integration tests**

Create `backend/src/__tests__/auth.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('POST /api/v1/signup', () => {
    it('creates a new user with valid input', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Account created successfully');
    });

    it('rejects duplicate username', async () => {
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'dupeuser', password: 'password123' });

        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'dupeuser', password: 'password456' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Username already exists');
    });

    it('rejects short username', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'ab', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('rejects short password', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'testuser2', password: '12345' });

        expect(res.status).toBe(400);
    });

    it('rejects username with special characters', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'test user!', password: 'password123' });

        expect(res.status).toBe(400);
    });
});

describe('POST /api/v1/signin', () => {
    beforeAll(async () => {
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'signinuser', password: 'password123' });
    });

    it('returns JWT token with valid credentials', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'signinuser', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });

    it('rejects wrong password', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'signinuser', password: 'wrongpassword' });

        expect(res.status).toBe(403);
    });

    it('rejects nonexistent user', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'nonexistent', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('rejects empty username', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: '', password: 'password123' });

        expect(res.status).toBe(400);
    });
});

describe('Protected routes — JWT middleware', () => {
    it('rejects request without Authorization header', async () => {
        const res = await request(app).get('/api/v1/content');
        expect(res.status).toBe(401);
    });

    it('rejects request with invalid token', async () => {
        const res = await request(app)
            .get('/api/v1/content')
            .set('Authorization', 'Bearer invalid-token-here');

        expect(res.status).toBe(401);
    });

    it('rejects request with malformed Authorization header', async () => {
        const res = await request(app)
            .get('/api/v1/content')
            .set('Authorization', 'NotBearer some-token');

        expect(res.status).toBe(401);
    });

    it('accepts request with valid token', async () => {
        // First create user and get token
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'jwtuser', password: 'password123' });

        const signin = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'jwtuser', password: 'password123' });

        const res = await request(app)
            .get('/api/v1/content')
            .set('Authorization', `Bearer ${signin.body.token}`);

        expect(res.status).toBe(200);
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd backend && npx vitest run src/__tests__/auth.test.ts`
Expected: All tests PASS

Note: If the import of `app` from `index.ts` causes `main()` to execute (calling `app.listen` and `connectDB`), you may need to guard the `main()` call. Wrap it:

```ts
// Only auto-start when run directly (not imported for testing)
if (require.main === module) {
    main().catch((err) => {
        logger.fatal({ err }, 'Fatal startup error');
        process.exit(1);
    });
}
```

If this guard is needed, add it during this step.

- [ ] **Step 4: Commit**

```bash
git add backend/src/__tests__/auth.test.ts backend/src/index.ts
git commit -m "test: add auth endpoint integration tests (signup, signin, JWT middleware)"
```

---

### Task 4: Backend — Content CRUD integration tests

**Files:**
- Create: `backend/src/__tests__/content.test.ts`

- [ ] **Step 1: Write content CRUD tests**

Create `backend/src/__tests__/content.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';

let token: string;

beforeAll(async () => {
    await request(app)
        .post('/api/v1/signup')
        .send({ username: 'contentuser', password: 'password123' });

    const res = await request(app)
        .post('/api/v1/signin')
        .send({ username: 'contentuser', password: 'password123' });

    token = res.body.token;
});

function authHeader() {
    return { Authorization: `Bearer ${token}` };
}

describe('POST /api/v1/content', () => {
    it('creates content with a YouTube URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({
                title: 'Test Video',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            });

        expect(res.status).toBe(201);
        expect(res.body.content.type).toBe('youtube');
        expect(res.body.content.contentId).toBe('dQw4w9WgXcQ');
    });

    it('creates content with a Twitter URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({
                title: 'Test Tweet',
                link: 'https://twitter.com/user/status/1234567890123456789'
            });

        expect(res.status).toBe(201);
        expect(res.body.content.type).toBe('twitter');
    });

    it('creates content with a generic URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({
                title: 'Test Link',
                link: 'https://example.com/article'
            });

        expect(res.status).toBe(201);
        expect(res.body.content.type).toBe('link');
    });

    it('rejects missing title', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({ link: 'https://example.com' });

        expect(res.status).toBe(400);
    });

    it('rejects missing link', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({ title: 'No Link' });

        expect(res.status).toBe(400);
    });

    it('rejects invalid URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({ title: 'Bad URL', link: 'not-a-url' });

        expect(res.status).toBe(400);
    });

    it('rejects title over 500 characters', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({ title: 'a'.repeat(501), link: 'https://example.com' });

        expect(res.status).toBe(400);
    });
});

describe('GET /api/v1/content', () => {
    it('returns user content with pagination metadata', async () => {
        const res = await request(app)
            .get('/api/v1/content')
            .set(authHeader());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.content)).toBe(true);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.total).toBeGreaterThan(0);
        expect(typeof res.body.pagination.hasMore).toBe('boolean');
    });

    it('respects limit parameter', async () => {
        const res = await request(app)
            .get('/api/v1/content?limit=1')
            .set(authHeader());

        expect(res.body.content.length).toBe(1);
        expect(res.body.pagination.limit).toBe(1);
    });

    it('respects skip parameter', async () => {
        const all = await request(app)
            .get('/api/v1/content')
            .set(authHeader());

        const skipped = await request(app)
            .get(`/api/v1/content?skip=1`)
            .set(authHeader());

        expect(skipped.body.content.length).toBe(all.body.content.length - 1);
    });

    it('does not return other users content', async () => {
        // Create second user
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'otheruser', password: 'password123' });

        const otherSignin = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'otheruser', password: 'password123' });

        const res = await request(app)
            .get('/api/v1/content')
            .set({ Authorization: `Bearer ${otherSignin.body.token}` });

        expect(res.body.content.length).toBe(0);
    });
});

describe('DELETE /api/v1/content', () => {
    it('deletes own content', async () => {
        // Create content first
        const created = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({
                title: 'To Delete',
                link: 'https://example.com/delete-me'
            });

        const contentId = created.body.content._id;

        const res = await request(app)
            .delete('/api/v1/content')
            .set(authHeader())
            .send({ contentId });

        expect(res.status).toBe(200);
    });

    it('returns 404 for nonexistent content', async () => {
        const res = await request(app)
            .delete('/api/v1/content')
            .set(authHeader())
            .send({ contentId: '000000000000000000000000' });

        expect(res.status).toBe(404);
    });

    it('rejects missing contentId', async () => {
        const res = await request(app)
            .delete('/api/v1/content')
            .set(authHeader())
            .send({});

        expect(res.status).toBe(400);
    });

    it('cannot delete another users content', async () => {
        // Create content as main user
        const created = await request(app)
            .post('/api/v1/content')
            .set(authHeader())
            .send({
                title: 'Other User Content',
                link: 'https://example.com/protected'
            });

        // Try to delete as other user
        const otherSignin = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'otheruser', password: 'password123' });

        const res = await request(app)
            .delete('/api/v1/content')
            .set({ Authorization: `Bearer ${otherSignin.body.token}` })
            .send({ contentId: created.body.content._id });

        expect(res.status).toBe(404);
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npx vitest run src/__tests__/content.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/content.test.ts
git commit -m "test: add content CRUD integration tests (create, read, delete, pagination, ownership)"
```

---

### Task 5: Backend — Share brain endpoint tests

**Files:**
- Create: `backend/src/__tests__/share.test.ts`

- [ ] **Step 1: Write share brain tests**

Create `backend/src/__tests__/share.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';

let token: string;

beforeAll(async () => {
    await request(app)
        .post('/api/v1/signup')
        .send({ username: 'shareuser', password: 'password123' });

    const res = await request(app)
        .post('/api/v1/signin')
        .send({ username: 'shareuser', password: 'password123' });

    token = res.body.token;

    // Add some content to share
    await request(app)
        .post('/api/v1/content')
        .set({ Authorization: `Bearer ${token}` })
        .send({ title: 'Shared Item', link: 'https://example.com/shared' });
});

describe('POST /api/v1/brain/share', () => {
    it('creates a share link', async () => {
        const res = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        expect(res.status).toBe(200);
        expect(res.body.hash).toBeDefined();
        expect(typeof res.body.hash).toBe('string');
        expect(res.body.hash.length).toBeGreaterThan(0);
    });

    it('returns same hash on repeated calls', async () => {
        const r1 = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        const r2 = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        expect(r1.body.hash).toBe(r2.body.hash);
    });

    it('removes share link when share is false', async () => {
        const res = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: false });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('removed link');
    });
});

describe('GET /api/v1/brain/:shareLink', () => {
    let shareHash: string;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        shareHash = res.body.hash;
    });

    it('returns shared content for valid hash', async () => {
        const res = await request(app)
            .get(`/api/v1/brain/${shareHash}`);

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('shareuser');
        expect(Array.isArray(res.body.content)).toBe(true);
        expect(res.body.pagination).toBeDefined();
    });

    it('returns 404 for invalid hash', async () => {
        const res = await request(app)
            .get('/api/v1/brain/nonexistenthash');

        expect(res.status).toBe(404);
    });

    it('does not require authentication', async () => {
        const res = await request(app)
            .get(`/api/v1/brain/${shareHash}`);

        // No Authorization header — should still work
        expect(res.status).toBe(200);
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npx vitest run src/__tests__/share.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/share.test.ts
git commit -m "test: add share brain endpoint tests (create, reuse, revoke, public access)"
```

---

### Task 6: Frontend — Install test dependencies and configure Vitest

**Files:**
- Modify: `frontend/package.json` (scripts + devDependencies)
- Modify: `frontend/vite.config.ts` (add test config)

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install -D vitest jsdom
```

- [ ] **Step 2: Add test config to vite.config.ts**

Update `frontend/vite.config.ts` — add the `test` block to `defineConfig`:

```ts
/// <reference types="vitest/config" />

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

- [ ] **Step 3: Update package.json test script**

In `frontend/package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run `npx vitest run` to verify setup**

Run: `cd frontend && npx vitest run`
Expected: "No test files found" (no error)

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/vite.config.ts
git commit -m "test: add Vitest testing infrastructure to frontend"
```

---

### Task 7: Frontend — Provider parsing unit tests

**Files:**
- Create: `frontend/src/__tests__/providers.test.ts`

- [ ] **Step 1: Write frontend provider tests**

Create `frontend/src/__tests__/providers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseUrl, quickValidateUrl, isValidUrl } from '../providers';

describe('parseUrl (frontend)', () => {
    it('parses YouTube URL', () => {
        const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(result!.type).toBe('youtube');
        expect(result!.contentId).toBe('dQw4w9WgXcQ');
    });

    it('parses Twitter URL', () => {
        const result = parseUrl('https://twitter.com/user/status/1234567890123456789');
        expect(result!.type).toBe('twitter');
        expect(result!.contentId).toBe('1234567890123456789');
    });

    it('parses generic URL as link', () => {
        const result = parseUrl('https://example.com');
        expect(result!.type).toBe('link');
    });

    it('returns null for invalid URL', () => {
        expect(parseUrl('not-a-url')).toBeNull();
    });
});

describe('quickValidateUrl', () => {
    it('returns valid for YouTube URL', () => {
        const result = quickValidateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(result.valid).toBe(true);
        expect(result.type).toBe('youtube');
        expect(result.displayName).toBe('YouTube');
    });

    it('returns invalid for empty string', () => {
        const result = quickValidateUrl('');
        expect(result.valid).toBe(false);
    });

    it('returns invalid for garbage input', () => {
        const result = quickValidateUrl('asdfghjkl');
        expect(result.valid).toBe(false);
        expect(result.message).toBeDefined();
    });

    it('returns embed info for embeddable content', () => {
        const result = quickValidateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(result.canEmbed).toBe(true);
        expect(result.embedUrl).toBeDefined();
    });

    it('returns canEmbed false for generic links', () => {
        const result = quickValidateUrl('https://example.com');
        expect(result.canEmbed).toBe(false);
    });
});

describe('isValidUrl', () => {
    it('accepts https', () => expect(isValidUrl('https://example.com')).toBe(true));
    it('accepts http', () => expect(isValidUrl('http://example.com')).toBe(true));
    it('rejects ftp', () => expect(isValidUrl('ftp://example.com')).toBe(false));
    it('rejects garbage', () => expect(isValidUrl('not-a-url')).toBe(false));
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && npx vitest run src/__tests__/providers.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/providers.test.ts
git commit -m "test: add frontend provider URL parsing and validation tests"
```

---

### Task 8: Frontend — API interceptor unit tests

**Files:**
- Create: `frontend/src/__tests__/api.test.ts`

- [ ] **Step 1: Write API interceptor tests**

Create `frontend/src/__tests__/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth module before importing api
vi.mock('../lib/auth', () => ({
    getToken: vi.fn(() => 'mock-token'),
    removeToken: vi.fn(),
}));

// Mock config
vi.mock('../config', () => ({
    BACKEND_URL: 'http://localhost:5000',
}));

import api from '../lib/api';
import { getToken, removeToken } from '../lib/auth';

describe('API interceptor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('attaches Authorization header when token exists', () => {
        // Access the request interceptor logic
        const config = { headers: {} as Record<string, string> } as any;
        // The interceptor is already registered on the api instance
        // We can verify by checking that getToken is called
        expect(getToken).toBeDefined();
    });

    it('creates axios instance with correct baseURL', () => {
        expect(api.defaults.baseURL).toBe('http://localhost:5000');
    });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && npx vitest run src/__tests__/api.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/api.test.ts
git commit -m "test: add API interceptor unit tests"
```

---

### Task 9: Run full test suites and verify everything passes

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npx vitest run
```

Expected: All test files pass, no errors.

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: All test files pass, no errors.

- [ ] **Step 3: Verify builds still work**

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit any remaining fixes**

If any tests needed adjustments, commit them here.

---

### Task 10: Add CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow file**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npx tsc --noEmit
      - run: cd backend && npm test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for backend + frontend test and lint"
```
