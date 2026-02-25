# Phase 0: PostgreSQL Migration — Pre-Merge Testing Guide

> Branch: `phase0/postgresql-migration`
> Purpose: Verify every feature before merging to `main`

## Prerequisites

### 1. Start Infrastructure

```bash
cd backend
cp .env.example .env   # Edit with your real keys
docker compose up -d db
```

Wait for PostgreSQL to be healthy:

```bash
docker compose ps   # db should show "healthy"
```

### 2. Run Migrations

```bash
npm run db:migrate
```

Verify tables exist:

```bash
docker compose exec db psql -U brainly -d brainly -c "\dt"
```

Expected tables: `users`, `tags`, `contents`, `content_tags`, `share_links`, plus the `drizzle` migration journal.

### 3. Build & Start Server

```bash
npm run dev
```

Server should log: `{"level":30,"msg":"Server running","port":5000}`

---

## Test Sections

### A. Authentication

#### A1. Signup — Happy Path

```bash
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "test123456"}' | jq .
```

**Expected:** `201` — `{"message": "Account created successfully"}`

#### A2. Signup — Duplicate Username

```bash
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "different123"}' | jq .
```

**Expected:** `409` — `{"message": "Username already exists"}`

#### A3. Signup — Validation Errors

```bash
# Username too short
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "ab", "password": "test123456"}' | jq .
```

**Expected:** `400` — message about minimum 3 characters

```bash
# Password too short
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "validuser", "password": "12345"}' | jq .
```

**Expected:** `400` — message about minimum 6 characters

```bash
# Invalid characters in username
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "test user!", "password": "test123456"}' | jq .
```

**Expected:** `400` — message about allowed characters

#### A4. Signin — Happy Path

```bash
curl -s -X POST http://localhost:5000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "test123456"}' | jq .
```

**Expected:** `200` — `{"token": "<jwt_token>"}`

Save this token for all subsequent authenticated requests:

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "test123456"}' | jq -r '.token')
echo $TOKEN
```

#### A5. Signin — Wrong Password

```bash
curl -s -X POST http://localhost:5000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "wrongpassword"}' | jq .
```

**Expected:** `403` — `{"message": "Incorrect Credentials"}`

#### A6. Signin — Non-existent User

```bash
curl -s -X POST http://localhost:5000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "nouser", "password": "test123456"}' | jq .
```

**Expected:** `400` — `{"message": "Invalid credentials"}`

#### A7. Get Current User Profile

```bash
curl -s http://localhost:5000/api/v1/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200` — user object with `id`, `username`, `authProvider: "local"`, no `password` field

#### A8. Auth — Missing/Invalid Token

```bash
# No token
curl -s http://localhost:5000/api/v1/me | jq .

# Invalid token
curl -s http://localhost:5000/api/v1/me \
  -H "Authorization: Bearer invalid_token_here" | jq .
```

**Expected:** `401` or `403` — unauthorized response

#### A9. Google OAuth (if GOOGLE_CLIENT_ID configured)

```bash
# Without credential
curl -s -X POST http://localhost:5000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Expected:** `400` — `{"message": "Google credential is required"}`

```bash
# If GOOGLE_CLIENT_ID is not set
curl -s -X POST http://localhost:5000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential": "fake"}' | jq .
```

**Expected:** `503` — `{"message": "Google authentication is not configured"}`

> Full Google OAuth testing requires a real Google token from the frontend.

---

### B. Content Management

#### B1. Create Content — YouTube Link

```bash
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test YouTube Video", "link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | jq .
```

**Expected:** `201` — content object with:
- `_id` (UUID format)
- `type: "youtube"`
- `contentId` populated (YouTube video ID)
- `tags: []`

#### B2. Create Content — Twitter Link

```bash
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test Tweet", "link": "https://twitter.com/elonmusk/status/1234567890"}' | jq .
```

**Expected:** `201` — `type: "twitter"`

#### B3. Create Content — GitHub Link

```bash
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test Repo", "link": "https://github.com/timescale/pgai"}' | jq .
```

**Expected:** `201` — `type: "github"`

#### B4. Create Content — Generic Link

```bash
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Blog Post", "link": "https://example.com/blog/post"}' | jq .
```

**Expected:** `201` — `type: "link"` (generic fallback)

#### B5. Create Content — With Tags

First create a tag (see section C), then:

```bash
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Tagged Content", "link": "https://example.com/tagged", "tags": ["<TAG_ID>"]}' | jq .
```

**Expected:** `201` — content with `tags` array containing the tag objects

#### B6. Create Content — Validation Errors

```bash
# Missing title
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"link": "https://example.com"}' | jq .
```

**Expected:** `400` — `"Title is required"`

```bash
# Invalid URL
curl -s -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Bad Link", "link": "not-a-url"}' | jq .
```

**Expected:** `400` — `"Invalid URL format..."`

#### B7. List User Content

```bash
curl -s http://localhost:5000/api/v1/content \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200` — `{"content": [...]}` array with all created content. Each item has:
- `_id` (not `id` — frontend compat)
- `tags` array with `_id` and `name` for each tag
- `createdAt` timestamp

#### B8. Delete Content

Use an `_id` from the list response:

```bash
curl -s -X DELETE http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentId": "<CONTENT_ID>"}' | jq .
```

**Expected:** `200` — `{"message": "Content deleted successfully"}`

```bash
# Try deleting the same content again
curl -s -X DELETE http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentId": "<CONTENT_ID>"}' | jq .
```

**Expected:** `404` — `{"message": "Content not found"}`

```bash
# Invalid UUID format
curl -s -X DELETE http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentId": "not-a-uuid"}' | jq .
```

**Expected:** `400` — `{"message": "Invalid contentId format"}`

#### B9. Validate URL

```bash
curl -s -X POST http://localhost:5000/api/v1/content/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | jq .
```

**Expected:** `200` — `valid: true`, `type: "youtube"`, provider metadata

```bash
curl -s -X POST http://localhost:5000/api/v1/content/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"link": "ftp://invalid.com"}' | jq .
```

**Expected:** `400` — `valid: false`

#### B10. List Providers

```bash
curl -s http://localhost:5000/api/v1/content/providers | jq .
```

**Expected:** `200` — list of supported content providers (YouTube, Twitter, GitHub, etc.)

---

### C. Tag Management

#### C1. Create Tag

```bash
curl -s -X POST http://localhost:5000/api/v1/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "programming"}' | jq .
```

**Expected:** `201` — `{"message": "Tag created successfully", "tag": {"_id": "<uuid>", "name": "programming", ...}}`

#### C2. Create Duplicate Tag

```bash
curl -s -X POST http://localhost:5000/api/v1/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "programming"}' | jq .
```

**Expected:** `409` — `{"message": "Tag already exists", "tag": {...}}`

#### C3. Tag Name Normalization

```bash
curl -s -X POST http://localhost:5000/api/v1/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "  JavaScript  "}' | jq .
```

**Expected:** `201` — tag name should be `"javascript"` (trimmed, lowercased)

#### C4. List Tags

```bash
curl -s http://localhost:5000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200` — `{"tags": [...]}` sorted by name, each with `_id`

#### C5. Delete Tag

```bash
curl -s -X DELETE http://localhost:5000/api/v1/tags/<TAG_ID> \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200` — `{"message": "Tag deleted successfully"}`

Verify cascade: any content that had this tag should no longer reference it (check via GET /content).

#### C6. Update Content Tags

```bash
# Create two tags first, save their IDs as TAG1 and TAG2
curl -s -X PUT http://localhost:5000/api/v1/content/<CONTENT_ID>/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tags": ["<TAG1>", "<TAG2>"]}' | jq .
```

**Expected:** `200` — `{"message": "Tags updated successfully"}`

Verify by listing content — the content item should show both tags.

```bash
# Clear all tags
curl -s -X PUT http://localhost:5000/api/v1/content/<CONTENT_ID>/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tags": []}' | jq .
```

**Expected:** `200` — content should have empty tags array

---

### D. Brain Sharing

#### D1. Enable Sharing

```bash
curl -s -X POST http://localhost:5000/api/v1/brain/share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"share": true}' | jq .
```

**Expected:** `200` — `{"hash": "<10_char_hex>"}`

Save the hash:

```bash
SHARE_HASH="<hash_from_response>"
```

#### D2. Enable Sharing Again (Idempotent)

```bash
curl -s -X POST http://localhost:5000/api/v1/brain/share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"share": true}' | jq .
```

**Expected:** `200` — same hash as before (does not create a new link)

#### D3. Access Shared Brain (Public — No Auth Required)

```bash
curl -s http://localhost:5000/api/v1/brain/$SHARE_HASH | jq .
```

**Expected:** `200` — `{"username": "testuser", "content": [...]}` — all user's content with `_id` fields

#### D4. Access Invalid Share Link

```bash
curl -s http://localhost:5000/api/v1/brain/doesnotexist | jq .
```

**Expected:** `404` — `{"message": "Share link not found"}`

#### D5. Disable Sharing

```bash
curl -s -X POST http://localhost:5000/api/v1/brain/share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"share": false}' | jq .
```

**Expected:** `200` — `{"message": "removed link"}`

Verify the old share link no longer works:

```bash
curl -s http://localhost:5000/api/v1/brain/$SHARE_HASH | jq .
```

**Expected:** `404`

---

### E. Content Enrichment Service

The enrichment service runs automatically in the background. To test it:

#### E1. Verify Service Starts

When the server boots, you should see in logs:

```
{"level":30,"service":"enrichment","pollIntervalMs":30000,"msg":"Enrichment service started"}
```

#### E2. Observe Enrichment in Action

After creating a YouTube content item (B1), watch the logs. Within 30 seconds (default poll interval) you should see:

```
{"level":30,"service":"enrichment","contentId":"...","type":"youtube","msg":"Enriching content"}
{"level":30,"service":"enrichment","contentId":"...","msg":"Enrichment complete"}
```

#### E3. Verify Enriched Data in DB

```bash
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT id, type, enrichment_status, meta_title, meta_author, LEFT(full_text, 100) AS full_text_preview FROM contents LIMIT 5;"
```

Successfully enriched items should show:
- `enrichment_status = 'enriched'`
- `meta_title`, `meta_author`, `full_text` populated (varies by content type)

#### E4. Verify Retry Logic

Items that fail enrichment (e.g., invalid URLs, API rate limits) should show:
- `enrichment_status = 'pending'` with `enrichment_retries > 0` (still retrying)
- `enrichment_status = 'failed'` with `enrichment_retries = 3` (exhausted retries)
- `enrichment_error` contains the error message

```bash
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT id, type, enrichment_status, enrichment_retries, enrichment_error FROM contents WHERE enrichment_status IN ('failed', 'pending') AND enrichment_retries > 0;"
```

#### E5. Verify Per-User Fairness

Create a second user and add content for both. The enrichment service uses `DISTINCT ON (user_id)` to process one item per user per batch, preventing one user from monopolizing the queue.

#### E6. Stale Processing Recovery

If the server crashes while enriching, items stuck in `processing` state are reset to `pending` on next boot:

```
{"level":40,"service":"enrichment","count":N,"msg":"Reset stale processing documents to pending"}
```

---

### F. Database Schema Verification

#### F1. Check Table Structure

```bash
docker compose exec db psql -U brainly -d brainly -c "\d users"
docker compose exec db psql -U brainly -d brainly -c "\d contents"
docker compose exec db psql -U brainly -d brainly -c "\d tags"
docker compose exec db psql -U brainly -d brainly -c "\d content_tags"
docker compose exec db psql -U brainly -d brainly -c "\d share_links"
```

#### F2. Verify Foreign Key Cascades

Delete a user and verify all their content, tags, content_tags, and share_links are also deleted:

```bash
# Create a throwaway user
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "deletetest", "password": "test123456"}'

# Sign in, create content and tags, then:
docker compose exec db psql -U brainly -d brainly -c \
  "DELETE FROM users WHERE username = 'deletetest';"

# Verify no orphaned records
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT COUNT(*) FROM contents WHERE user_id NOT IN (SELECT id FROM users);"
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT COUNT(*) FROM tags WHERE user_id NOT IN (SELECT id FROM users);"
```

**Expected:** 0 orphaned records

#### F3. Verify Unique Constraints

```bash
# Duplicate username should fail
docker compose exec db psql -U brainly -d brainly -c \
  "INSERT INTO users (id, username, password) VALUES (gen_random_uuid(), 'testuser', 'hash');"
```

**Expected:** ERROR unique constraint violation

```bash
# Duplicate tag name for same user
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT id FROM users LIMIT 1;"
# Use that user ID:
docker compose exec db psql -U brainly -d brainly -c \
  "INSERT INTO tags (id, name, user_id) VALUES (gen_random_uuid(), 'programming', '<USER_ID>'), (gen_random_uuid(), 'programming', '<USER_ID>');"
```

**Expected:** ERROR unique constraint on `idx_tag_name_user`

#### F4. Verify updated_at Trigger

```bash
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT id, updated_at FROM contents LIMIT 1;"

# Note the updated_at, then update the row:
docker compose exec db psql -U brainly -d brainly -c \
  "UPDATE contents SET title = 'Updated Title' WHERE id = '<CONTENT_ID>';"

docker compose exec db psql -U brainly -d brainly -c \
  "SELECT id, updated_at FROM contents WHERE id = '<CONTENT_ID>';"
```

**Expected:** `updated_at` has changed to the current time automatically

---

### G. Cross-User Isolation

#### G1. Create Second User

```bash
curl -s -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "user2", "password": "test123456"}'

TOKEN2=$(curl -s -X POST http://localhost:5000/api/v1/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "user2", "password": "test123456"}' | jq -r '.token')
```

#### G2. Verify Content Isolation

```bash
# User2's content should be empty
curl -s http://localhost:5000/api/v1/content \
  -H "Authorization: Bearer $TOKEN2" | jq '.content | length'
```

**Expected:** `0` (even though testuser has content)

#### G3. Verify Tag Isolation

```bash
curl -s http://localhost:5000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN2" | jq '.tags | length'
```

**Expected:** `0`

#### G4. Verify Cannot Delete Other User's Content

```bash
# Get testuser's content ID
CONTENT_ID=$(curl -s http://localhost:5000/api/v1/content \
  -H "Authorization: Bearer $TOKEN" | jq -r '.content[0]._id')

# Try to delete with user2's token
curl -s -X DELETE http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"contentId\": \"$CONTENT_ID\"}" | jq .
```

**Expected:** `404` — content not found (user2 doesn't own it)

---

### H. Rate Limiting

#### H1. Global Rate Limit

Fire 101 requests in quick succession:

```bash
for i in $(seq 1 101); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/content/providers)
  echo "Request $i: $STATUS"
done
```

**Expected:** After 100 requests, subsequent requests return `429` with "Too many requests" message.

#### H2. Auth Rate Limit (Stricter)

```bash
for i in $(seq 1 11); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/v1/signin \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "wrong"}')
  echo "Request $i: $STATUS"
done
```

**Expected:** After 10 requests, returns `429`.

> Note: Rate limits reset after 15 minutes. Restart the server to reset for testing.

---

### I. Graceful Shutdown

#### I1. SIGTERM Handling

With the server running, send SIGTERM:

```bash
kill -TERM $(pgrep -f "node.*dist")
```

**Expected logs:**
```
{"level":30,"msg":"Shutdown signal received, closing gracefully"}
{"level":30,"service":"enrichment","msg":"Enrichment service stopped"}
```

The process should exit cleanly (exit code 0).

#### I2. SIGINT Handling (Ctrl+C)

Press `Ctrl+C` in the terminal running `npm run dev`.

**Expected:** Same graceful shutdown as SIGTERM.

---

### J. Docker Compose Infrastructure

#### J1. Health Check

```bash
docker compose ps
```

**Expected:** `db` service shows `healthy`

#### J2. Data Persistence

```bash
docker compose down
docker compose up -d db
# Wait for healthy, then:
docker compose exec db psql -U brainly -d brainly -c "SELECT COUNT(*) FROM users;"
```

**Expected:** Previous data still exists (volume persists)

#### J3. Clean Slate

```bash
docker compose down -v
docker compose up -d db
# Wait for healthy, then re-run migration:
npm run db:migrate
```

**Expected:** Fresh database, all tables recreated

---

### K. pgai Vectorizer Setup (Optional — requires OPENAI_API_KEY)

Only test this if you have a valid `OPENAI_API_KEY` and want to test the vector embedding pipeline.

#### K1. Run Setup

```bash
npm run setup:pgai
```

**Expected output:**
- "pgai extension installed"
- "Vectorizer created for contents.full_text"

#### K2. Start Vectorizer Worker

```bash
docker compose up -d vectorizer-worker
```

#### K3. Verify Embeddings

After the enrichment service has populated `full_text` for some content, the vectorizer worker should automatically generate embeddings:

```bash
docker compose exec db psql -U brainly -d brainly -c \
  "SELECT COUNT(*) FROM contents_embedding_store;"
```

**Expected:** Count > 0 for content items that have `full_text` populated

---

### L. LLM Client (Smoke Test)

The LLM client is used by future AI features. Basic validation:

#### L1. Import Check (TypeScript)

The client compiles without errors (verified by `npx tsc --noEmit`).

#### L2. Lazy Init — No Crash Without Keys

The server should start normally even without `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set, because the LLM providers are lazily initialized — they only throw when `getModel()` is actually called.

---

### M. Data Migration Script (One-Time)

Only relevant if migrating from an existing MongoDB instance.

#### M1. Dry Run

```bash
# Ensure MONGO_URI and DATABASE_URL are set in .env
npm run migrate:data
```

**Expected output:**
- Counts of users, tags, content migrated
- ID mapping log (MongoDB ObjectId → PostgreSQL UUID)
- Conflict handling for duplicates (`ON CONFLICT DO NOTHING`)

#### M2. Verify Data

```bash
docker compose exec db psql -U brainly -d brainly -c "SELECT COUNT(*) FROM users;"
docker compose exec db psql -U brainly -d brainly -c "SELECT COUNT(*) FROM tags;"
docker compose exec db psql -U brainly -d brainly -c "SELECT COUNT(*) FROM contents;"
```

Compare counts with the MongoDB source.

---

## Summary Checklist

| # | Area | Test | Status |
|---|------|------|--------|
| A1 | Auth | Signup happy path | |
| A2 | Auth | Signup duplicate | |
| A3 | Auth | Signup validation | |
| A4 | Auth | Signin happy path | |
| A5 | Auth | Signin wrong password | |
| A6 | Auth | Signin non-existent user | |
| A7 | Auth | Get profile (/me) | |
| A8 | Auth | Missing/invalid token | |
| A9 | Auth | Google OAuth basic | |
| B1 | Content | Create YouTube | |
| B2 | Content | Create Twitter | |
| B3 | Content | Create GitHub | |
| B4 | Content | Create generic | |
| B5 | Content | Create with tags | |
| B6 | Content | Validation errors | |
| B7 | Content | List content | |
| B8 | Content | Delete content | |
| B9 | Content | Validate URL | |
| B10 | Content | List providers | |
| C1 | Tags | Create tag | |
| C2 | Tags | Duplicate tag | |
| C3 | Tags | Name normalization | |
| C4 | Tags | List tags | |
| C5 | Tags | Delete tag + cascade | |
| C6 | Tags | Update content tags | |
| D1 | Sharing | Enable sharing | |
| D2 | Sharing | Idempotent enable | |
| D3 | Sharing | Access shared brain | |
| D4 | Sharing | Invalid share link | |
| D5 | Sharing | Disable sharing | |
| E1 | Enrichment | Service starts | |
| E2 | Enrichment | Processes content | |
| E3 | Enrichment | Enriched data in DB | |
| E4 | Enrichment | Retry logic | |
| E5 | Enrichment | Per-user fairness | |
| E6 | Enrichment | Stale recovery | |
| F1 | DB | Table structure | |
| F2 | DB | Foreign key cascades | |
| F3 | DB | Unique constraints | |
| F4 | DB | updated_at trigger | |
| G1-G4 | Security | Cross-user isolation | |
| H1 | Rate Limit | Global limit | |
| H2 | Rate Limit | Auth limit | |
| I1-I2 | Infra | Graceful shutdown | |
| J1-J3 | Infra | Docker Compose | |
| K1-K3 | AI | pgai vectorizer | |
| L1-L2 | AI | LLM client | |
| M1-M2 | Migration | Data migration | |
