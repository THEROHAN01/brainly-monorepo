---
title: Server & Core
description: The Express entry point, middleware, configuration, logger, and shared utilities.
---

The backend is a TypeScript + Express 4 API server backed by MongoDB (Mongoose).
This page covers the application core; the provider, extractor, enrichment, and
security subsystems each have their own page.

## Entry point & server (`src/index.ts`)

The single file that wires up the entire Express application (~658 lines).

**Responsibilities:**

- Creates the Express `app` instance.
- Applies global middleware: Helmet (security headers), CORS, JSON body parser,
  rate limiters.
- Defines all API route handlers inline.
- Exports `app` for use by tests.
- Guards `main()` behind `process.env.VITEST` so tests don't auto-start the server.
- `main()` connects to MongoDB, starts the HTTP server, and starts the enrichment
  service.

**Security middleware applied at startup:**

- `helmet()` — sets HTTP security headers (CSP disabled since the frontend is a
  separate SPA; COEP disabled to allow YouTube/Twitter iframes).
- `cors()` — restricted to the `CORS_ORIGIN` env var (default
  `http://localhost:5173`), allowing GET/POST/PUT/DELETE/OPTIONS with the
  Authorization header.
- Rate limiting (see below).

**Rate limiters:**

| Limiter | Applied to | Limit | Window |
| --- | --- | --- | --- |
| `globalLimiter` | All routes | 100 req/IP | 15 min |
| `authLimiter` | `/signup`, `/signin`, `/auth/google` | 10 req/IP | 15 min |
| `contentCreationLimiter` | `POST /content` | 30 req/IP | 15 min |

All limiters use `max: 10000` during `VITEST=true` so tests are not throttled.
See [Security](/docs/backend/security) for the full rationale.

**Validation schemas (Zod):**

- `signupSchema` — username: 3–30 chars, alphanumeric + underscore; password: 6–100 chars.
- `signinSchema` — both fields required, non-empty.

## Middleware (`src/middleware.ts`)

`userMiddleware(req, res, next)` is the JWT authentication guard for protected
routes:

1. Reads the `Authorization: Bearer <token>` header.
2. Verifies the token with `JWT_SECRET`.
3. Attaches `req.userId` (string) from `token.id`.
4. Returns `401` if the token is missing, malformed, invalid, or expired.

## Configuration (`src/config.ts`)

A centralized feature-flags object. No env var reads except for API keys.

```ts
config.providers.youtube      // true  — YouTube URL parser active
config.providers.twitter      // true
config.providers.instagram    // true
config.providers.github       // true
config.providers.medium       // true
config.providers.notion       // false — no extractor yet; URLs would stay stuck in 'pending'

config.extractors.enabled         // true
config.extractors.pollIntervalMs  // 30,000 ms
config.extractors.maxRetries      // 3
config.extractors.retryDelayMs    // 60,000 ms

config.apiKeys.youtubeApiKey      // YOUTUBE_API_KEY env var
config.apiKeys.githubToken        // GITHUB_TOKEN env var
config.apiKeys.twitterBearerToken // TWITTER_BEARER_TOKEN env var
config.apiKeys.instagramAppId     // INSTAGRAM_APP_ID env var
```

## Logger (`src/logger.ts`)

Exports a [Pino](https://github.com/pinojs/pino) logger instance. Log level is
controlled by `LOG_LEVEL` (default `info`). Used throughout the backend with
child loggers for service-level context:

```ts
const log = logger.child({ service: 'enrichment' });
const contentLog = log.child({ contentId, type, url });
contentLog.info('Processing content');
contentLog.error({ err, attempt, maxRetries }, 'Extraction failed');
```

**Why Pino?** Structured JSON output (machine-parseable for log aggregation),
child loggers add context without string concatenation, it's the fastest Node.js
logger, and pretty-printing is available in development via `pino-pretty`.

## Utils (`src/utils.ts`)

`random(len: number): string` — generates a random alphanumeric string of `len`
characters. Used to create share-link hashes (`random(10)`).

## Types (`src/types.d.ts`)

Augments the Express `Request` interface to add `userId?: string`. This is what
allows `req.userId` in route handlers after `userMiddleware` runs.
