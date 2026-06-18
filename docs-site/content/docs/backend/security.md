---
title: Security
description: SSRF protection, HTTP security headers (Helmet), and tiered rate limiting.
---

Brainly's backend applies defense-in-depth across three areas: SSRF protection in
the extractor layer, HTTP security headers via Helmet, and tiered rate limiting.

## SSRF protection & safe fetch

**File:** `backend/src/extractors/safe-fetch.ts`

All external HTTP requests in the extractor layer go through `safeFetch()`, which
provides three layers of protection.

### 1. SSRF prevention

Resolves the hostname via DNS and checks all returned IPv4 addresses against
blocked private ranges:

| Range | Description |
| --- | --- |
| `10.x.x.x` | Class A private |
| `172.16-31.x.x` | Class B private |
| `192.168.x.x` | Class C private |
| `127.x.x.x` | Loopback |
| `169.254.x.x` | Link-local |
| `0.0.0.0` | Unspecified |
| `::1` | IPv6 loopback |
| `fe80::` | IPv6 link-local |
| `fc00::`/`fd00::` | IPv6 ULA |

Extractors calling known-safe APIs (YouTube Data API, GitHub API) use
`skipSsrfCheck: true` to avoid unnecessary DNS resolution overhead.

### 2. Timeout enforcement

Uses `AbortController` with `setTimeout`. Default: 15 seconds. Throws
`Fetch timed out after Nms` on `AbortError`.

### 3. Body size limiting

- **Fast path:** checks the `Content-Length` header before reading the body.
- **Streaming path:** if no Content-Length, streams the body with a running byte
  counter and throws `Response too large` if exceeded.
- **Default limit:** 5 MB.

## HTTP security headers (Helmet)

```ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
```

**Why those two are disabled:**

- `contentSecurityPolicy: false` — the frontend is a separate SPA on a different
  origin; CSP would block it from calling the API. CSP belongs on the frontend's
  static server, where it controls script sources.
- `crossOriginEmbedderPolicy: false` — the app embeds YouTube iframes, Twitter
  oEmbed widgets, and Instagram embeds. COEP (`require-corp`) would block all
  cross-origin embeds that don't send a `Cross-Origin-Resource-Policy` header
  (which YouTube/Twitter don't).

**Headers Helmet enables by default:**

| Header | What it prevents |
| --- | --- |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing |
| `X-Frame-Options: SAMEORIGIN` | Clickjacking via cross-origin iframes |
| `Strict-Transport-Security` | HTTPS downgrade attacks (HSTS) |
| `X-XSS-Protection: 0` | Disables the buggy legacy XSS auditor |
| `X-DNS-Prefetch-Control: off` | DNS prefetch info leak |
| `X-Download-Options: noopen` | IE-specific download execution |
| `X-Permitted-Cross-Domain-Policies: none` | Flash/PDF cross-domain data loading |
| `Referrer-Policy: no-referrer` | Leaking the full URL in the Referer header |
| `Cross-Origin-Opener-Policy: same-origin` | Window reference isolation (Spectre) |

## Rate limiting

Three tiers of `express-rate-limit` middleware:

```ts
import rateLimit from 'express-rate-limit';

// Tier 1: Global — all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 100,                   // 100 requests per window per IP
  standardHeaders: true,      // RateLimit-* headers in response
  legacyHeaders: false,
});
app.use(globalLimiter);

// Tier 2: Auth endpoints — strictest
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
// Applied to: POST /signup, POST /signin, POST /auth/google

// Tier 3: Content creation
const contentCreationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
// Applied to: POST /content
```

**Why three tiers:** auth endpoints need the strictest limit (10/15min) because
credential brute-forcing is the #1 attack vector against login forms. Content
creation gets a medium limit (30/15min) to prevent database abuse while allowing
power users to bulk-save. Global catches everything else at 100/15min.

When rate-limited, the response is:

```json
HTTP 429 Too Many Requests
{ "message": "Too many authentication attempts, please try again after 15 minutes." }
```

## Middleware ordering

```text
1. helmet()           — security headers (runs first)
2. cors()             — CORS preflight/headers
3. express.json()     — body parsing
4. globalLimiter      — global 100/15min gate
5. Per-route limiters — authLimiter, contentCreationLimiter
6. userMiddleware     — JWT auth (on protected routes)
7. Route handler      — business logic
```

Helmet and CORS run before rate limiting so that even 429 responses include proper
security and CORS headers. The global limiter runs before per-route limiters, so a
single IP can never exceed 100 requests total regardless of endpoint.

## Production considerations

- **In-memory store:** the default `express-rate-limit` store resets on restart and
  doesn't work across instances. For horizontal scaling, swap to `rate-limit-redis`
  or `rate-limit-mongo`.
- **Reverse proxy:** behind nginx/Cloudflare, set `app.set('trust proxy', 1)` so
  `express-rate-limit` reads the real client IP from `X-Forwarded-For`.

> A dated log of when these protections were added lives in
> [Changelog → Security Fixes](/docs/changelog/security-fixes).
