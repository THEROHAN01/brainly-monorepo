# Security Fixes — Rate Limiting & HTTP Security Headers

## The Problem

### 1. No Rate Limiting (Brute-Force Vulnerability)

Every endpoint — including `/api/v1/signup`, `/api/v1/signin`, and `/api/v1/auth/google` — accepted unlimited requests from any IP address. This meant:

- **Credential stuffing**: An attacker could script thousands of signin attempts per minute to guess passwords.
- **Account enumeration**: Mass signup requests to discover which usernames already exist.
- **Resource exhaustion**: Unthrottled POST requests to content-creation endpoints could fill the database or overload MongoDB.

This is **OWASP Top 10 — A07:2021 (Identification and Authentication Failures)**.

### 2. No HTTP Security Headers (XSS / Clickjacking / MIME-Sniffing)

The Express server returned no security-related HTTP headers. Responses lacked:

- `X-Content-Type-Options` — browsers could MIME-sniff responses and execute uploaded content as scripts.
- `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` — the app could be embedded in a malicious iframe (clickjacking).
- `Strict-Transport-Security` (HSTS) — no enforcement of HTTPS, allowing man-in-the-middle downgrades.
- `X-XSS-Protection` — legacy browsers had no XSS filter hint.
- `X-DNS-Prefetch-Control`, `X-Permitted-Cross-Domain-Policies` — missing defense-in-depth headers.

This is **OWASP Top 10 — A05:2021 (Security Misconfiguration)**.

---

## The Fix

### File Changed

`backend/src/index.ts` — the single Express server entry point (monolith architecture).

### Packages Added

| Package              | Version | Purpose                                    |
|----------------------|---------|--------------------------------------------|
| `helmet`             | ^8.x    | Sets 11+ HTTP security headers in one call |
| `express-rate-limit` | ^7.x    | IP-based request throttling middleware      |

### Implementation Details

#### Helmet (Security Headers)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
```

**Why these two are disabled:**

- `contentSecurityPolicy: false` — Our frontend is a separate SPA served from a different origin. CSP would block the frontend from calling the API. CSP should be configured on the frontend's static server instead, where it controls script sources.
- `crossOriginEmbedderPolicy: false` — The app embeds YouTube iframes, Twitter oEmbed widgets, and Instagram embeds. COEP (`require-corp`) would block all cross-origin embeds that don't send a `Cross-Origin-Resource-Policy` header (which YouTube/Twitter don't).

**Headers that Helmet enables by default:**

| Header                             | What it prevents                                              |
|------------------------------------|---------------------------------------------------------------|
| `X-Content-Type-Options: nosniff`  | MIME-type sniffing — browser won't execute a `.txt` as JS     |
| `X-Frame-Options: SAMEORIGIN`      | Clickjacking — blocks embedding in cross-origin iframes       |
| `Strict-Transport-Security`        | HTTPS downgrade attacks (HSTS — browsers remember to use TLS) |
| `X-XSS-Protection: 0`             | Disables buggy legacy XSS auditor (modern CSP is preferred)   |
| `X-DNS-Prefetch-Control: off`      | DNS prefetch info leak                                        |
| `X-Download-Options: noopen`       | IE-specific download execution                                |
| `X-Permitted-Cross-Domain-Policies: none` | Flash/PDF cross-domain data loading                    |
| `Referrer-Policy: no-referrer`     | Prevents leaking full URL in Referer header                   |
| `Cross-Origin-Opener-Policy: same-origin` | Window reference isolation (Spectre mitigations)       |

#### Rate Limiting (express-rate-limit)

Three tiers of rate limits, applied as Express middleware:

```typescript
import rateLimit from 'express-rate-limit';

// Tier 1: Global — all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 100,                   // 100 requests per window per IP
  standardHeaders: true,      // RateLimit-* headers in response
  legacyHeaders: false,       // No X-RateLimit-* headers
});
app.use(globalLimiter);

// Tier 2: Auth endpoints — strictest
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                    // Only 10 attempts per 15 min
});
// Applied to: POST /signup, POST /signin, POST /auth/google

// Tier 3: Content creation
const contentCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                    // 30 submissions per 15 min
});
// Applied to: POST /content
```

**Why three tiers instead of one:**

- **Auth endpoints** need the strictest limits (10/15min) because credential brute-forcing is the #1 attack vector against login forms. A real user won't fail login 10 times in 15 minutes.
- **Content creation** gets a medium limit (30/15min) to prevent database abuse while allowing a power user to bulk-save links.
- **Global** catches everything else (GET /content, GET /tags, etc.) at 100/15min — generous enough for normal SPA usage, but stops any single IP from hammering the API.

**How it works internally:**

`express-rate-limit` uses an in-memory store by default. Each IP address gets a counter that increments on every request. When the counter exceeds `max` within `windowMs`, the middleware short-circuits with `429 Too Many Requests` and a JSON message body — the request never reaches the route handler.

**Response headers returned:**

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1708300800
```

These follow the [IETF RateLimit header draft standard](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) and allow the frontend to show "try again in X seconds" if needed.

**When rate-limited, the response is:**

```json
HTTP 429 Too Many Requests
{ "message": "Too many authentication attempts, please try again after 15 minutes." }
```

### Middleware Ordering

The final middleware stack order is:

```
1. helmet()                    — security headers (runs first, adds headers to every response)
2. cors()                      — CORS preflight/headers
3. express.json()              — body parsing
4. globalLimiter               — global 100/15min gate
5. Per-route limiters          — authLimiter on /signup, /signin, /auth/google
                                 contentCreationLimiter on POST /content
6. userMiddleware              — JWT auth (on protected routes)
7. Route handler               — business logic
```

This order matters: Helmet and CORS run before rate limiting so that even rate-limited (429) responses include proper security headers and CORS headers. The global limiter runs before per-route limiters, so a single IP can never exceed 100 requests total regardless of endpoint.

---

## Production Considerations

**In-memory store limitation:** The default store resets if the server restarts and doesn't work across multiple server instances. For production with horizontal scaling, swap to `rate-limit-redis` or `rate-limit-mongo`:

```typescript
import RedisStore from 'rate-limit-redis';

const globalLimiter = rateLimit({
  store: new RedisStore({ /* redis client */ }),
  // ...
});
```

**Reverse proxy (nginx/cloudflare):** If the app sits behind a proxy, Express sees all traffic as `127.0.0.1`. Set `app.set('trust proxy', 1)` so `express-rate-limit` reads the `X-Forwarded-For` header for real client IPs.
