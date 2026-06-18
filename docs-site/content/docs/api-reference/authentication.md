---
title: Authentication
description: Signup, signin, and Google OAuth endpoints.
---

## POST /api/v1/signup

Register a new user account with username/password.

**Rate limit:** 10/15min per IP · **Auth:** None

**Request body:**

```json
{
  "username": "john_doe",
  "password": "mypassword"
}
```

**Validation:** username 3–30 chars (letters/numbers/underscores); password 6–100 chars.

| Status | Body | Condition |
| --- | --- | --- |
| `201` | `{ message: "Account created successfully" }` | Success |
| `400` | `{ message: "Username already exists" }` | Duplicate username |
| `400` | `{ message: "<validation error>" }` | Invalid input |
| `500` | `{ message: "Failed to create account" }` | DB error |

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Express Server
    participant DB as MongoDB

    C->>S: POST /api/v1/signup {username, password}
    S->>S: Zod validation
    alt validation fails
        S-->>C: 400 {message: validation error}
    else valid input
        S->>DB: UserModel.findOne({username})
        alt username taken
            S-->>C: 400 Username already exists
        else new username
            S->>S: bcrypt.hash(password, 10)
            S->>DB: UserModel.create({username, hashedPassword})
            S-->>C: 201 Account created successfully
        end
    end
```

## POST /api/v1/signin

Authenticate with username/password. Returns a JWT.

**Rate limit:** 10/15min per IP · **Auth:** None

**Request body:**

```json
{
  "username": "john_doe",
  "password": "mypassword"
}
```

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ token: "<jwt>" }` | Success — JWT expires in 7 days |
| `400` | `{ message: "Invalid credentials" }` | User not found |
| `400` | `{ message: "This account uses Google sign-in..." }` | Google-only account |
| `403` | `{ message: "Incorrect Credentials" }` | Wrong password |

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Express Server
    participant DB as MongoDB

    C->>S: POST /api/v1/signin {username, password}
    S->>S: Zod validation
    S->>DB: UserModel.findOne({username})
    alt user not found
        S-->>C: 400 Invalid credentials
    else user has no password (Google-only account)
        S-->>C: 400 Use Google sign-in
    else password exists
        S->>S: bcrypt.compare(password, storedHash)
        alt match
            S->>S: jwt.sign({id}, JWT_SECRET, 7d)
            S-->>C: 200 {token}
        else mismatch
            S-->>C: 403 Incorrect Credentials
        end
    end
```

## POST /api/v1/auth/google

Google OAuth sign-in / sign-up. Verifies a Google ID token and returns a JWT.

**Rate limit:** 10/15min per IP · **Auth:** None

**Request body:**

```json
{
  "credential": "<google_id_token>"
}
```

**Behavior:**

- Verifies the `credential` token with `GOOGLE_CLIENT_ID`.
- Looks up an existing user by `googleId` OR `email`.
- If no user found: creates a new user (username = email prefix).
- If found by email but no `googleId`: links the Google account to the existing one.
- Issues a JWT (7-day expiry).

| Status | Body | Condition |
| --- | --- | --- |
| `200` | `{ token: "<jwt>" }` | Success |
| `400` | `{ message: "Google credential is required" }` | Missing credential |
| `401` | `{ message: "Google authentication failed", detail: "..." }` | Invalid token |
| `503` | `{ message: "Google authentication is not configured" }` | `GOOGLE_CLIENT_ID` not set |

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Google OAuth API
    participant S as Express Server
    participant DB as MongoDB

    C->>G: Google OAuth popup / one-tap
    G-->>C: {credential: id_token}
    C->>S: POST /api/v1/auth/google {credential}
    alt GOOGLE_CLIENT_ID not configured
        S-->>C: 503 Google authentication not configured
    else configured
        S->>G: OAuth2Client.verifyIdToken(credential, audience)
        alt invalid or expired token
            G-->>S: throws error
            S-->>C: 401 Google authentication failed
        else valid token
            G-->>S: payload {sub, email, name, picture}
            S->>DB: UserModel.findOne({$or:[{googleId:sub},{email}]})
            alt no existing user
                S->>DB: UserModel.create({googleId, email, username, picture, authProvider:google})
            else found by email, googleId missing
                S->>DB: user.save({googleId, picture, authProvider:google})
            end
            S->>S: jwt.sign({id}, JWT_SECRET, 7d)
            S-->>C: 200 {token}
        end
    end
```
