---
title: Overview
description: Base URL, authentication model, and the full endpoint map.
---

**Base URL:** `http://localhost:5000` (configurable via the `PORT` env var).

All protected endpoints expect a JWT in the `Authorization: Bearer <token>`
header. Tokens are issued by the auth endpoints and expire in 7 days. The
`userMiddleware` guard (see [Backend → Server & Core](/docs/backend)) verifies
the token and attaches `req.userId`.

> **Auth failures return `401`.** A missing, malformed, invalid, or expired token
> yields `401 Unauthorized` from `userMiddleware`. (Note: `POST /signin` returns
> `403` specifically for a *wrong password* on an otherwise-valid account — that
> is a route-level response, not the auth guard.)

## Endpoint map

| Method | Path | Auth | Group |
| --- | --- | --- | --- |
| POST | `/api/v1/signup` | None | [Authentication](/docs/api-reference/authentication) |
| POST | `/api/v1/signin` | None | [Authentication](/docs/api-reference/authentication) |
| POST | `/api/v1/auth/google` | None | [Authentication](/docs/api-reference/authentication) |
| POST | `/api/v1/content` | JWT | [Content](/docs/api-reference/content) |
| GET | `/api/v1/content` | JWT | [Content](/docs/api-reference/content) |
| DELETE | `/api/v1/content` | JWT | [Content](/docs/api-reference/content) |
| POST | `/api/v1/content/validate` | JWT | [Content](/docs/api-reference/content) |
| GET | `/api/v1/content/providers` | None | [Content](/docs/api-reference/content) |
| PUT | `/api/v1/content/:contentId/tags` | JWT | [Content](/docs/api-reference/content) |
| GET | `/api/v1/tags` | JWT | [Tags](/docs/api-reference/tags) |
| POST | `/api/v1/tags` | JWT | [Tags](/docs/api-reference/tags) |
| DELETE | `/api/v1/tags/:tagId` | JWT | [Tags](/docs/api-reference/tags) |
| POST | `/api/v1/brain/share` | JWT | [Brain Sharing](/docs/api-reference/brain-sharing) |
| GET | `/api/v1/brain/:shareLink` | None | [Brain Sharing](/docs/api-reference/brain-sharing) |
| GET | `/api/v1/me` | JWT | [User](/docs/api-reference/user) |

## Rate limits

| Limiter | Applied to | Limit | Window |
| --- | --- | --- | --- |
| Global | All routes | 100 req/IP | 15 min |
| Auth | `/signup`, `/signin`, `/auth/google` | 10 req/IP | 15 min |
| Content creation | `POST /content` | 30 req/IP | 15 min |

See [Security → Rate limiting](/docs/backend/security#rate-limiting) for details.
