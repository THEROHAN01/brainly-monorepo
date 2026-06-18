---
title: Brain Sharing
description: Create or revoke a public share link, and fetch a shared brain.
---

## POST /api/v1/brain/share

Create or revoke a public share link for the user's entire brain.

**Auth:** Required (JWT)

**Request body:**

```json
{ "share": true }   // enable sharing
{ "share": false }  // revoke sharing
```

**Behavior (`share: true`):** if a link already exists for this user, returns the
existing hash (idempotent); otherwise creates one with a new 10-char random hash.

**Behavior (`share: false`):** deletes the `Link` document for this user.

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ hash: "abc1234xyz" }` | Sharing enabled (new or existing) |
| `200` | `{ message: "removed link" }` | Sharing revoked |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: POST /api/v1/brain/share {share: true|false}
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId

    alt share === true
        S->>DB: LinkModel.findOne({userId})
        alt link already exists
            DB-->>S: existing link
            S-->>C: 200 {hash: existingHash}
        else no link
            S->>S: random(10) to hash
            S->>DB: LinkModel.create({userId, hash})
            S-->>C: 200 {hash}
        end
    else share === false
        S->>DB: LinkModel.deleteOne({userId})
        S-->>C: 200 {message: removed link}
    end
```

## GET /api/v1/brain/:shareLink

Fetch a user's brain by share hash. **Public — no auth.**

**URL param:** `shareLink` — the 10-char hash. **Query params:** `limit`
(default 1000, max 1000), `skip` (default 0).

**Response `200`:**

```json
{
  "username": "john_doe",
  "content": [ {} ],
  "pagination": { "total": 42, "limit": 1000, "skip": 0, "hasMore": false }
}
```

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ username, content[], pagination }` | Found |
| `404` | `{ message: "Share link not found" }` | Hash doesn't exist |
| `404` | `{ message: "User not found" }` | User was deleted |
| `500` | `{ message: "Failed to load shared brain" }` | DB error |

```mermaid
sequenceDiagram
    participant V as Visitor (no auth)
    participant S as Express Server
    participant DB as MongoDB

    V->>S: GET /api/v1/brain/:shareLink
    S->>DB: LinkModel.findOne({hash: shareLink})
    alt hash not found
        S-->>V: 404 Share link not found
    else hash found
        S->>DB: ContentModel.find({userId:link.userId}).sort(-createdAt).skip().limit()
        S->>DB: ContentModel.countDocuments({userId:link.userId})
        S->>DB: UserModel.findById(link.userId)
        alt user deleted
            S-->>V: 404 User not found
        else user exists
            DB-->>S: [content, total, user]
            S-->>V: 200 {username, content[], pagination}
        end
    end
```
