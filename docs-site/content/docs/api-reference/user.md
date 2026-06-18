---
title: User
description: Fetch the authenticated user's profile.
---

## GET /api/v1/me

Get the authenticated user's profile. `password` and `googleId` are excluded from
the response.

**Auth:** Required (JWT)

**Response `200`:**

```json
{
  "user": {
    "id": "...",
    "username": "john_doe",
    "email": "john@example.com",
    "profilePicture": "https://...",
    "authProvider": "google"
  }
}
```

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ user: {...} }` | Found |
| `404` | `{ message: "User not found" }` | User missing |
| `401` | `{ message: "..." }` | Invalid or missing token |

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as JWT Middleware
    participant S as Express Server
    participant DB as MongoDB

    C->>S: GET /api/v1/me
    S->>MW: userMiddleware(req)
    MW->>MW: jwt.verify(token, JWT_SECRET)
    alt invalid or missing token
        MW-->>C: 401 Unauthorized
    else valid
        MW-->>S: req.userId
        S->>DB: UserModel.findById(userId).select(-password -googleId)
        alt user not found
            S-->>C: 404 User not found
        else found
            S-->>C: 200 {user:{id, username, email, profilePicture, authProvider}}
        end
    end
```
