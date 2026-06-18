---
title: Security Fixes
description: The rate-limiting and HTTP-security-header hardening, and why each was needed.
---

This page records the security hardening applied to `backend/src/index.ts`. For
the current canonical reference, see [Backend → Security](/docs/backend/security).

## The problems

### 1. No rate limiting (brute-force vulnerability)

Every endpoint — including `/signup`, `/signin`, and `/auth/google` — accepted
unlimited requests from any IP. This enabled credential stuffing, account
enumeration, and resource exhaustion. **OWASP A07:2021 — Identification and
Authentication Failures.**

### 2. No HTTP security headers (XSS / clickjacking / MIME-sniffing)

The server returned no security headers (Helmet enables nine by default in this
config — see the [Security reference](/docs/backend/security#http-security-headers-helmet)) — missing `X-Content-Type-Options`,
`X-Frame-Options`/`frame-ancestors`, HSTS, and defense-in-depth headers. **OWASP
A05:2021 — Security Misconfiguration.**

## The fix

**Packages added:**

| Package | Version | Purpose |
| --- | --- | --- |
| `helmet` | ^8.x | Sets a suite of HTTP security headers in one call |
| `express-rate-limit` | ^8.x | IP-based request throttling middleware |

The implementation — Helmet config, the three rate-limit tiers, the headers
enabled, the middleware ordering, and production considerations (Redis store,
`trust proxy`) — is documented in full at
[Backend → Security](/docs/backend/security).

## Production note

The default `express-rate-limit` in-memory store resets on restart and doesn't
work across instances. For horizontal scaling, swap to `rate-limit-redis` or
`rate-limit-mongo`, and set `app.set('trust proxy', 1)` behind a reverse proxy so
the real client IP is read from `X-Forwarded-For`.
