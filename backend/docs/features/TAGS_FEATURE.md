# Tags Feature - Backend Documentation

## Overview

The Tags feature allows users to categorize their saved content (tweets, YouTube videos) with custom topic-based labels. Tags are designed as semantic descriptors (e.g., "llm", "tech", "machine-learning", "andrej-karpathy") to enable future AI/RAG capabilities like semantic search and auto-categorization.

## Why This Feature?

### Current Problem
- Users save many links but have no way to organize or categorize them
- Finding specific content becomes difficult as the collection grows
- No semantic structure for future AI features

### Solution
- User-defined tags for content categorization
- Centralized tag management (create once, use everywhere)
- Foundation for future AI/RAG features (embeddings, semantic search, auto-tagging)

### Future Benefits
1. **Semantic Search** - Find content by topic, not just keywords
2. **AI Auto-Tagging** - Automatically suggest tags based on content
3. **Smart Recommendations** - Find related content via shared tags
4. **Analytics** - Understand user interests and content patterns

---

## Database Schema

### TagModel (`src/db.ts`)

```typescript
const TagSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Unique constraint: same user cannot have duplicate tag names
TagSchema.index({ name: 1, userId: 1 }, { unique: true });

export const TagModel = mongoose.model("Tag", TagSchema);
```

### Schema Design Decisions

| Field | Type | Purpose |
|-------|------|---------|
| `name` | String (required) | The tag text (stored lowercase, trimmed) |
| `userId` | ObjectId (ref: User) | Owner of the tag - enables multi-tenancy |
| `createdAt` | Date | Timestamp for analytics and sorting |

### Unique Index
- Compound index on `(name, userId)` ensures:
  - Same user cannot create duplicate tags
  - Different users can have the same tag name
  - Fast lookups by tag name for a specific user

### Future Schema Extensions
The schema is designed to support future AI/RAG features:

```typescript
// Future fields (not yet implemented):
{
  embedding: [Number],        // Vector embedding for semantic search
  source: String,             // 'user' | 'ai' - who created the tag
  confidence: Number,         // AI confidence score (0-1)
  usageCount: Number,         // How many times used (for suggestions)
  lastUsedAt: Date            // For "recently used" sorting
}
```

---

## API Endpoints

### 1. GET /api/v1/tags
**Get all tags for the authenticated user**

**Location:** `src/index.ts:284-294`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "tags": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "llm",
      "userId": "507f1f77bcf86cd799439012",
      "createdAt": "2024-01-07T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "tech",
      "userId": "507f1f77bcf86cd799439012",
      "createdAt": "2024-01-07T10:31:00.000Z"
    }
  ]
}
```

**Notes:**
- Tags are sorted alphabetically by name
- Only returns tags owned by the authenticated user

---

### 2. POST /api/v1/tags
**Create a new tag**

**Location:** `src/index.ts:296-335`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "name": "machine learning"
}
```

**Validation Rules:**
- `name` is required and must be a string
- Automatically converted to lowercase and trimmed
- Must be 1-50 characters after trimming
- Duplicate tags (same name for same user) return 409 with existing tag

**Success Response (201):**
```json
{
  "message": "Tag created successfully",
  "tag": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "machine learning",
    "userId": "507f1f77bcf86cd799439012",
    "createdAt": "2024-01-07T10:30:00.000Z"
  }
}
```

**Duplicate Response (409):**
```json
{
  "message": "Tag already exists",
  "tag": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "machine learning",
    ...
  }
}
```

**Why return existing tag on 409?**
- Frontend can use the returned tag immediately
- Enables "create or get" pattern without extra API call
- Better UX for autocomplete tag creation

---

### 3. DELETE /api/v1/tags/:tagId
**Delete a tag and remove it from all content**

**Location:** `src/index.ts:337-365`

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `tagId` - The MongoDB ObjectId of the tag to delete

**Success Response (200):**
```json
{
  "message": "Tag deleted successfully"
}
```

**Not Found Response (404):**
```json
{
  "message": "Tag not found"
}
```

**Cascade Behavior:**
When a tag is deleted, it is automatically removed from all content that references it:
```typescript
await ContentModel.updateMany(
    { userId },
    { $pull: { tags: tagId } }
);
```

**Security:**
- Only the tag owner can delete their tags
- `userId` check ensures users cannot delete other users' tags

---

### 4. PUT /api/v1/content/:contentId/tags
**Update tags on existing content**

**Location:** `src/index.ts:367-415`

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `contentId` - The MongoDB ObjectId of the content to update

**Request Body:**
```json
{
  "tags": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439013"]
}
```

**Success Response (200):**
```json
{
  "message": "Tags updated successfully",
  "content": {
    "_id": "...",
    "title": "...",
    "tags": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439013"],
    ...
  }
}
```

**Validation:**
- `tags` must be an array (can be empty to remove all tags)
- Only tags owned by the user are applied (invalid/foreign tag IDs are ignored)
- Content must belong to the authenticated user

**Security:**
- Users cannot add tags they don't own
- Users cannot modify other users' content

---

### 5. POST /api/v1/content (Modified)
**Create content with optional tags**

**Location:** `src/index.ts:211-252`

**Changes Made:**
- Added `tags` to request body destructuring
- Added tag validation before content creation
- Tags are validated against user's own tags

**Request Body (Updated):**
```json
{
  "title": "Intro to LLMs",
  "link": "https://youtube.com/watch?v=...",
  "type": "youtube",
  "tags": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439013"]
}
```

**Tag Validation Logic:**
```typescript
let validTagIds: mongoose.Types.ObjectId[] = [];
if (tags && Array.isArray(tags) && tags.length > 0) {
    const userTags = await TagModel.find({
        _id: { $in: tags },
        userId
    });
    validTagIds = userTags.map(t => t._id);
}
```

**Why validate tags?**
- Prevents users from using other users' tag IDs
- Silently ignores invalid tag IDs (better UX than error)
- Ensures data integrity

---

### 6. GET /api/v1/content (Modified)
**Get content with populated tags**

**Location:** `src/index.ts:255-268`

**Changes Made:**
- Added `.populate("tags", "name")` to include tag details

**Response (Updated):**
```json
{
  "content": [
    {
      "_id": "...",
      "title": "Intro to LLMs",
      "link": "https://youtube.com/...",
      "type": "youtube",
      "userId": { "_id": "...", "username": "john" },
      "tags": [
        { "_id": "507f1f77bcf86cd799439011", "name": "llm" },
        { "_id": "507f1f77bcf86cd799439013", "name": "tech" }
      ]
    }
  ]
}
```

**Why populate tags?**
- Frontend needs tag names to display badges
- Single API call returns all needed data
- Avoids N+1 query problem

---

## File Changes Summary

### `src/db.ts`

| Line(s) | Change | Description |
|---------|--------|-------------|
| 19-26 | Added | TagSchema definition with unique compound index |
| 26 | Added | TagModel export |
| 25-29 | Removed | TODO comment about missing Tag model (now resolved) |

### `src/index.ts`

| Line(s) | Change | Description |
|---------|--------|-------------|
| 55 | Modified | Added `TagModel` to imports |
| 212 | Modified | Added `tags` to destructuring in POST /content |
| 223-235 | Added | Tag validation logic in POST /content |
| 242 | Modified | Use `validTagIds` instead of empty array |
| 262-263 | Added | `.populate("tags", "name")` in GET /content |
| 282-415 | Added | All new tag endpoints (GET, POST, DELETE tags + PUT content tags) |

---

## Security Considerations

### Multi-Tenancy
- All tag operations filter by `userId`
- Users can only access their own tags
- Tag IDs from other users are silently ignored

### Input Validation
- Tag names are trimmed and lowercased
- Length validation (1-50 characters)
- Type checking on all inputs

### Authorization
- All endpoints require Bearer token authentication
- `userMiddleware` validates JWT and sets `req.userId`

---

## Testing the Feature

### Create a Tag
```bash
curl -X POST http://localhost:5000/api/v1/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "machine learning"}'
```

### Get All Tags
```bash
curl http://localhost:5000/api/v1/tags \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Content with Tags
```bash
curl -X POST http://localhost:5000/api/v1/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Intro to Transformers",
    "link": "https://youtube.com/watch?v=xyz",
    "type": "youtube",
    "tags": ["TAG_ID_1", "TAG_ID_2"]
  }'
```

### Update Content Tags
```bash
curl -X PUT http://localhost:5000/api/v1/content/CONTENT_ID/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["TAG_ID_1"]}'
```

### Delete a Tag
```bash
curl -X DELETE http://localhost:5000/api/v1/tags/TAG_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Future Enhancements

### Phase 2: Tag Filtering
- `GET /api/v1/content?tag=TAG_ID` - Filter content by tag
- `GET /api/v1/content?tags=ID1,ID2&match=all|any` - Multi-tag filtering

### Phase 3: AI Integration
- Add `embedding` field to TagSchema for vector search
- Endpoint for AI-suggested tags based on content URL
- Auto-tagging on content creation

### Phase 4: Analytics
- Tag usage statistics
- Popular tags endpoint
- Tag trends over time
