---
title: Content
description: Create, read, delete, validate content, list providers, and update content tags.
---

## POST /api/v1/content

Save a new URL to the user's brain.

**Rate limit:** 30/15min per IP · **Auth:** Required (JWT)

**Request body:**

```json
{
  "title": "My Video Title",
  "link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "tags": ["tagId1", "tagId2"]
}
```

**Behavior:**

- Parses `link` with the provider system to extract `type` and `contentId`.
- Validates that `tags` IDs belong to the authenticated user (silently drops invalid ones).
- Creates a `Content` document with `enrichmentStatus: 'pending'`.
- The enrichment service picks it up within 30s and fetches metadata in the background.

| Status | Body | Condition |
| --- | --- | --- |
| `201` | `{ message, content: { ...doc, displayName, embedUrl, canonicalUrl, canEmbed } }` | Success |
| `400` | `{ message: "Title is required" }` | Missing/empty title |
| `400` | `{ message: "Title must be 500 characters or less" }` | Title too long |
| `400` | `{ message: "Invalid URL format..." }` | URL fails provider parse |
| `500` | `{ message: "Failed to create content" }` | DB error |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB
    participant ES as Enrichment Service
    participant PA as Platform API

    C->>S: POST /api/v1/content {title, link, tags}
    S->>MW: userMiddleware(req)
    MW->>MW: jwt.verify(token, JWT_SECRET)
    alt invalid or missing token
        MW-->>C: 401 Unauthorized
    else valid
        MW-->>S: req.userId attached
        S->>S: parseUrl(link) via provider system
        alt invalid URL
            S-->>C: 400 Invalid URL format
        else valid URL
            S->>DB: TagModel.find({_id:{$in:tags}, userId})
            S->>DB: ContentModel.create({title, link, contentId, type, userId, tags, enrichmentStatus:pending})
            S-->>C: 201 {content, displayName, embedUrl, canEmbed}
        end
    end

    note over ES,PA: Background — runs within 30s, independent of HTTP response
    ES->>DB: aggregate(pending, group by userId, oldest per user, limit 5)
    ES->>DB: findOneAndUpdate(pending to processing) [atomic claim]
    ES->>PA: extractor.extract(link, contentId)
    PA-->>ES: ExtractedMetadata
    ES->>DB: updateOne({enrichmentStatus:enriched, metadata, enrichedAt})
```

## GET /api/v1/content

Fetch all content for the authenticated user.

**Auth:** Required (JWT)

**Query params:**

| Param | Default | Max | Description |
| --- | --- | --- | --- |
| `limit` | 1000 | 1000 | Number of items to return |
| `skip` | 0 | — | Offset for pagination |

**Response `200`:**

```json
{
  "content": [
    {
      "_id": "...",
      "title": "...",
      "link": "...",
      "type": "youtube",
      "contentId": "dQw4w9WgXcQ",
      "tags": [{ "_id": "...", "name": "..." }],
      "userId": { "_id": "...", "username": "..." },
      "enrichmentStatus": "enriched",
      "metadata": { },
      "createdAt": "..."
    }
  ],
  "pagination": { "total": 42, "limit": 1000, "skip": 0, "hasMore": false }
}
```

`tags` and `userId` are populated (not raw ObjectIds).

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: GET /api/v1/content?limit=50&skip=0
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId
    S->>DB: ContentModel.find({userId}).sort(-createdAt).skip().limit().populate(tags,userId)
    S->>DB: ContentModel.countDocuments({userId})
    DB-->>S: [content, total]
    S-->>C: 200 {content, pagination:{total, limit, skip, hasMore}}
```

## DELETE /api/v1/content

Delete a content item. Only the owner can delete.

**Auth:** Required (JWT)

**Request body:** `{ "contentId": "<mongodb_object_id>" }`

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ message: "Content deleted successfully" }` | Deleted |
| `400` | `{ message: "Content ID is required" }` | Missing body field |
| `400` | `{ message: "Invalid contentId format" }` | Bad ObjectId format |
| `404` | `{ message: "Content not found" }` | Not found or not owned by user |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: DELETE /api/v1/content {contentId}
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId
    alt contentId missing
        S-->>C: 400 Content ID is required
    else
        S->>DB: ContentModel.findOneAndDelete({_id:contentId, userId})
        alt not found or not owner
            S-->>C: 404 Content not found
        else deleted
            S-->>C: 200 Content deleted successfully
        end
    end
```

## POST /api/v1/content/validate

Validate a URL without saving it. Returns preview information for the UI.

**Auth:** Required (JWT)

**Request body:** `{ "link": "https://github.com/torvalds/linux" }`

**Response `200`:**

```json
{
  "valid": true,
  "type": "github",
  "displayName": "GitHub",
  "contentId": "torvalds/linux",
  "embedUrl": null,
  "canonicalUrl": "https://github.com/torvalds/linux",
  "canEmbed": false,
  "embedType": "card"
}
```

**Response `400`:** `{ "valid": false, "message": "Invalid URL format..." }`

This endpoint is pure in-process — it calls `parseUrl(link)` with no DB or network
access.

## GET /api/v1/content/providers

List all active content providers. **Public — no auth.**

**Response `200`:**

```json
{
  "providers": [
    { "type": "youtube", "displayName": "YouTube", "supportsEmbed": true }
  ]
}
```

Returns the in-memory provider registry via `getProviderInfo()`, which exposes
only `type`, `displayName`, and `supportsEmbed` per provider.

## PUT /api/v1/content/:contentId/tags

Replace the tags on an existing content item.

**Auth:** Required (JWT) · **URL param:** `contentId`

**Request body:** `{ "tags": ["tagId1", "tagId2"] }`

**Behavior:** verifies content ownership, replaces the entire tags array (not
additive), and silently drops any tag IDs not owned by the user.

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ message: "Tags updated successfully", content: {...} }` | Updated |
| `400` | `{ message: "Tags must be an array" }` | Invalid body |
| `404` | `{ message: "Content not found" }` | Not found or not owned |
| `500` | `{ message: "Failed to update tags" }` | DB error |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: PUT /api/v1/content/:contentId/tags {tags:[id...]}
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId
    alt tags is not an array
        S-->>C: 400 Tags must be an array
    else
        S->>DB: ContentModel.findOne({_id:contentId, userId})
        alt not found or not owner
            S-->>C: 404 Content not found
        else found
            S->>DB: TagModel.find({_id:{$in:tags}, userId})
            note right of DB: silently drops any tags not owned by user
            S->>DB: content.save({tags: validTagIds})
            S-->>C: 200 {message, content}
        end
    end
```
