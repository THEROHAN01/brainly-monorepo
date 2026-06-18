---
title: Tags
description: List, create, and delete user-scoped tags.
---

## GET /api/v1/tags

Get all tags belonging to the authenticated user, sorted alphabetically by name.

**Auth:** Required (JWT)

**Response `200`:**

```json
{
  "tags": [
    { "_id": "...", "name": "machine-learning", "userId": "...", "createdAt": "..." }
  ]
}
```

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: GET /api/v1/tags
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId
    S->>DB: TagModel.find({userId}).sort({name:1})
    DB-->>S: tags
    S-->>C: 200 {tags}
```

## POST /api/v1/tags

Create a new tag for the authenticated user.

**Auth:** Required (JWT)

**Request body:** `{ "name": "machine-learning" }`

**Behavior:** name is trimmed and lowercased; duplicate check per user returns
`409` if it already exists.

| Status | Body | Condition |
| --- | --- | --- |
| `201` | `{ message: "Tag created successfully", tag: {...} }` | Created |
| `400` | `{ message: "Tag name is required" }` | Missing name |
| `400` | `{ message: "Tag name must be 1-50 characters" }` | Length invalid |
| `409` | `{ message: "Tag already exists", tag: {...} }` | Duplicate |
| `500` | `{ message: "Failed to create tag" }` | DB error |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: POST /api/v1/tags {name}
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId
    alt name missing or invalid length
        S-->>C: 400 validation error
    else
        S->>S: name.trim().toLowerCase()
        S->>DB: TagModel.findOne({name:trimmed, userId})
        alt tag exists
            S-->>C: 409 Tag already exists {tag}
        else new tag
            S->>DB: TagModel.create({name, userId})
            S-->>C: 201 {tag}
        end
    end
```

## DELETE /api/v1/tags/:tagId

Delete a tag and remove it from all content that referenced it.

**Auth:** Required (JWT) · **URL param:** `tagId`

**Behavior:** deletes the tag document, then runs
`ContentModel.updateMany({ userId }, { $pull: { tags: tagId } })` to clean
references (cascading remove).

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ message: "Tag deleted successfully" }` | Deleted |
| `404` | `{ message: "Tag not found" }` | Not found or not owned |
| `500` | `{ message: "Failed to delete tag" }` | DB error |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: DELETE /api/v1/tags/:tagId
    S->>MW: userMiddleware(req)
    MW-->>S: req.userId
    S->>DB: TagModel.findOneAndDelete({_id:tagId, userId})
    alt not found or not owner
        S-->>C: 404 Tag not found
    else deleted
        S->>DB: ContentModel.updateMany({userId}, {$pull:{tags:tagId}})
        note right of DB: cascading remove — cleans all content referencing this tag
        S-->>C: 200 Tag deleted successfully
    end
```
