# Brainly Product Roadmap & Feature Documentation

> **Vision**: Be the AI-native knowledge manager. Not just storage—understanding.
> **Tagline**: "Save anything. Understand everything. Forget nothing."

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Phase 1: Foundation Fixes](#phase-1-foundation-fixes)
3. [Phase 2: Core Features](#phase-2-core-features)
4. [Phase 3: AI Differentiation](#phase-3-ai-differentiation)
5. [Phase 4: Growth & Virality](#phase-4-growth--virality)
6. [Phase 5: Platform & Monetization](#phase-5-platform--monetization)
7. [Technical Specifications](#technical-specifications)
8. [Database Schema Evolution](#database-schema-evolution)
9. [API Endpoints Roadmap](#api-endpoints-roadmap)
10. [Security Checklist](#security-checklist)

---

## Current State Analysis

### What Works
| Feature | Status | Location |
|---------|--------|----------|
| User Signup (Local) | Working | `POST /api/v1/signup` |
| User Signin (Local) | Working | `POST /api/v1/signin` |
| Google OAuth | Working | `POST /api/v1/auth/google` |
| Create Content | Working | `POST /api/v1/content` |
| View Content | Working | `GET /api/v1/content` |
| Delete Content | Backend Only | `DELETE /api/v1/content` |
| Share Brain | Working | `POST /api/v1/brain/share` |
| View Shared Brain | Working | `GET /api/v1/brain/:shareLink` |
| User Profile | Working | `GET /api/v1/me` |
| User Avatar Dropdown | Working | `UserAvatar.tsx` |

### What's Broken/Missing
| Feature | Issue | Priority |
|---------|-------|----------|
| Delete Button UI | No button on Card component | HIGH |
| Sidebar Filters | Non-functional (no onClick) | HIGH |
| Protected Routes | Dashboard accessible without auth | HIGH |
| Tags System | Model missing, UI missing | MEDIUM |
| Search | Zero implementation | MEDIUM |
| Edit Content | No endpoint or UI | MEDIUM |
| Loading States | No spinners/skeletons | LOW |
| Empty States | No "no content" message | LOW |

### Security Issues
| Issue | Risk Level | Fix Required |
|-------|------------|--------------|
| JWT no expiration | HIGH | Add `expiresIn: '7d'` |
| Content create not awaited | MEDIUM | Add `async/await` |
| No input validation | MEDIUM | Add Zod validation |
| Hardcoded JWT fallback | MEDIUM | Remove fallback |
| No rate limiting | MEDIUM | Add express-rate-limit |

---

## Phase 1: Foundation Fixes

**Timeline**: Week 1-2
**Goal**: Fix all broken functionality and security issues

### 1.1 Protected Routes

**Description**: Prevent unauthenticated users from accessing dashboard.

**Frontend Implementation**:
```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
```

**Files to Modify**:
- `src/App.tsx` - Wrap dashboard route with ProtectedRoute
- Create `src/components/ProtectedRoute.tsx`

**Acceptance Criteria**:
- [ ] Unauthenticated users redirected to `/signin`
- [ ] Token validation on protected routes
- [ ] Redirect back to intended page after login

---

### 1.2 Delete Content Button

**Description**: Add delete functionality to content cards.

**Frontend Changes**:
```tsx
// Card.tsx - Add delete button and handler
interface CardProps {
  _id: string;  // Add this
  title: string;
  link: string;
  type: "twitter" | "youtube";
  onDelete?: (id: string) => void;  // Add this
}
```

**Files to Modify**:
- `src/components/ui/Card.tsx` - Add delete button with confirmation
- `src/pages/dashboard.tsx` - Pass `_id` and `onDelete` handler
- `src/hooks/useContents.tsx` - Add `deleteContent` function

**UI Design**:
- Trash icon in card header (top-right)
- Confirmation modal before delete
- Optimistic UI update (remove immediately, rollback on error)

**Acceptance Criteria**:
- [ ] Delete button visible on each card
- [ ] Confirmation dialog before deletion
- [ ] Content removed from UI after successful delete
- [ ] Error toast on failure with retry option

---

### 1.3 Working Sidebar Filters

**Description**: Filter content by type (Twitter/YouTube/All).

**State Management**:
```tsx
// dashboard.tsx
const [filter, setFilter] = useState<'all' | 'twitter' | 'youtube'>('all');

const filteredContents = contents.filter(content =>
  filter === 'all' ? true : content.type === filter
);
```

**Files to Modify**:
- `src/components/ui/Sidebar.tsx` - Add onClick handlers, active state
- `src/components/ui/SidebarItem.tsx` - Accept `isActive` and `onClick` props
- `src/pages/dashboard.tsx` - Add filter state and logic

**Acceptance Criteria**:
- [ ] Clicking Twitter shows only tweets
- [ ] Clicking YouTube shows only videos
- [ ] Active filter highlighted in sidebar
- [ ] "All" option to show everything
- [ ] Filter persists during session

---

### 1.4 JWT Security Fixes

**Description**: Add token expiration and improve security.

**Backend Changes**:
```typescript
// index.ts - Update all jwt.sign calls
const token = jwt.sign(
  { id: user._id },
  JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);
```

**Files to Modify**:
- `Brainly/src/index.ts` - Lines 142-144, 203
- `Brainly/src/middleware.ts` - Handle expired token error
- `brainly-frontend/src/hooks/useUser.ts` - Handle 401 (redirect to login)

**Acceptance Criteria**:
- [ ] Tokens expire after 7 days
- [ ] Expired tokens return 401
- [ ] Frontend handles 401 by redirecting to signin
- [ ] Remove hardcoded fallback secret

---

### 1.5 Await Content Creation

**Description**: Fix race condition in content creation.

**Backend Changes**:
```typescript
// index.ts - Make handler async
app.post("/api/v1/content", userMiddleware, async (req, res) => {
  try {
    const content = await ContentModel.create({
      title,
      link,
      type,
      userId: req.userId,
      tags: []
    });
    return res.status(201).json({ message: "Content created", content });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create content" });
  }
});
```

**Files to Modify**:
- `Brainly/src/index.ts` - Line 212-236

**Acceptance Criteria**:
- [ ] Content creation awaited
- [ ] Proper error handling
- [ ] Return created content in response
- [ ] Return 201 status on success

---

### 1.6 Loading & Empty States

**Description**: Add visual feedback for loading and empty states.

**Components to Create**:
```
src/components/ui/
├── Spinner.tsx        # Loading spinner
├── Skeleton.tsx       # Content skeleton loader
├── EmptyState.tsx     # No content message with CTA
└── ErrorState.tsx     # Error message with retry
```

**EmptyState Design**:
- Illustration or icon
- "Your brain is empty" message
- "Add your first piece of content" CTA button

**Loading State Design**:
- Skeleton cards matching Card.tsx layout
- Pulsing animation
- Show 4-8 skeleton cards

**Files to Modify**:
- `src/hooks/useContents.tsx` - Export `loading` and `error` states
- `src/pages/dashboard.tsx` - Conditionally render states

**Acceptance Criteria**:
- [ ] Skeleton loader while fetching content
- [ ] Empty state with CTA when no content
- [ ] Error state with retry button on failure
- [ ] Smooth transitions between states

---

## Phase 2: Core Features

**Timeline**: Week 3-6
**Goal**: Implement essential features for a complete product

### 2.1 Full-Text Search

**Description**: Search across all saved content by title and link.

**Backend Implementation**:
```typescript
// New endpoint: GET /api/v1/content/search?q=react
app.get("/api/v1/content/search", userMiddleware, async (req, res) => {
  const { q } = req.query;
  const userId = req.userId;

  const content = await ContentModel.find({
    userId,
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { link: { $regex: q, $options: 'i' } }
    ]
  });

  res.json({ content });
});
```

**Frontend Implementation**:
- Search input in dashboard header
- Debounced search (300ms)
- Highlight matching text in results
- Search history (recent searches)

**Files to Create/Modify**:
- `Brainly/src/index.ts` - Add search endpoint
- `src/components/ui/SearchInput.tsx` - New component
- `src/hooks/useSearch.tsx` - Search hook with debounce
- `src/pages/dashboard.tsx` - Integrate search

**Database Index**:
```javascript
// Add text index for better search performance
ContentSchema.index({ title: 'text', link: 'text' });
```

**Acceptance Criteria**:
- [ ] Search by title
- [ ] Search by link/URL
- [ ] Case-insensitive search
- [ ] Debounced input (no spam requests)
- [ ] Clear search button
- [ ] "No results" state
- [ ] Search works with filters combined

---

### 2.2 Tags System

**Description**: Add, remove, and filter content by tags.

**Database Schema**:
```typescript
// Option A: Embedded tags (simpler)
const ContentSchema = new Schema({
  // ... existing fields
  tags: [{ type: String }]  // Change from ObjectId ref
});

// Option B: Tag collection (more features)
const TagSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#08CB00' },
  userId: { type: ObjectId, ref: 'User', required: true }
});
```

**Recommendation**: Start with Option A (embedded strings), migrate to Option B later if needed.

**Backend Endpoints**:
```
POST   /api/v1/content/:id/tags     - Add tag to content
DELETE /api/v1/content/:id/tags/:tag - Remove tag from content
GET    /api/v1/tags                  - Get all user's tags (aggregated)
```

**Frontend Components**:
```
src/components/ui/
├── TagInput.tsx       # Autocomplete tag input
├── TagBadge.tsx       # Individual tag display
├── TagFilter.tsx      # Tag filter in sidebar
└── TagManager.tsx     # Manage all tags modal
```

**UI/UX**:
- Tags shown as colored badges on cards
- Click tag to filter by that tag
- Multi-tag filtering (AND/OR logic)
- Suggested tags based on existing tags
- Tag autocomplete in CreateContentModal

**Acceptance Criteria**:
- [ ] Add tags when creating content
- [ ] Add/remove tags on existing content
- [ ] Filter content by tag
- [ ] Tag autocomplete from existing tags
- [ ] Tags displayed on cards
- [ ] Multi-tag filter support

---

### 2.3 Collections/Folders

**Description**: Organize content into named collections.

**Database Schema**:
```typescript
const CollectionSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },  // Emoji or icon name
  color: { type: String, default: '#08CB00' },
  isPublic: { type: Boolean, default: false },
  userId: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Add to ContentSchema
const ContentSchema = new Schema({
  // ... existing fields
  collectionId: { type: ObjectId, ref: 'Collection' }
});
```

**Backend Endpoints**:
```
POST   /api/v1/collections           - Create collection
GET    /api/v1/collections           - Get user's collections
PUT    /api/v1/collections/:id       - Update collection
DELETE /api/v1/collections/:id       - Delete collection
POST   /api/v1/content/:id/move      - Move content to collection
GET    /api/v1/collections/:id/share - Get shareable collection link
```

**Frontend Components**:
```
src/components/ui/
├── CollectionCard.tsx      # Collection preview card
├── CollectionSidebar.tsx   # Collections in sidebar
├── CreateCollectionModal.tsx
├── CollectionView.tsx      # View single collection
└── MoveToCollectionModal.tsx
```

**UI/UX**:
- Collections shown in sidebar below filters
- Drag-and-drop content into collections
- Collection icons/colors for visual organization
- "Uncategorized" default collection
- Share entire collection publicly

**Acceptance Criteria**:
- [ ] Create/edit/delete collections
- [ ] Move content between collections
- [ ] View collection contents
- [ ] Share public collections
- [ ] Collection count in sidebar
- [ ] Drag-and-drop support

---

### 2.4 Edit Content

**Description**: Edit title, link, type, tags of existing content.

**Backend Endpoint**:
```typescript
// PUT /api/v1/content/:id
app.put("/api/v1/content/:id", userMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, link, type, tags } = req.body;

  const content = await ContentModel.findOneAndUpdate(
    { _id: id, userId: req.userId },
    { title, link, type, tags, updatedAt: new Date() },
    { new: true }
  );

  if (!content) {
    return res.status(404).json({ message: "Content not found" });
  }

  res.json({ content });
});
```

**Frontend Implementation**:
- Edit button on Card component
- Reuse CreateContentModal with edit mode
- Pre-fill form with existing values
- "Save Changes" button

**Files to Modify**:
- `Brainly/src/index.ts` - Add PUT endpoint
- `src/components/ui/Card.tsx` - Add edit button
- `src/components/ui/CreateContentModal.tsx` - Add edit mode
- `src/pages/dashboard.tsx` - Handle edit flow

**Acceptance Criteria**:
- [ ] Edit button on each card
- [ ] Modal pre-filled with current values
- [ ] Update title, link, type, tags
- [ ] Optimistic UI update
- [ ] Cancel discards changes

---

### 2.5 Browser Extension

**Description**: Chrome/Firefox extension to save content with one click.

**Extension Structure**:
```
brainly-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── content/
│   └── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

**Features**:
- Save current page with one click
- Auto-detect content type (Twitter/YouTube/Article)
- Add tags before saving
- Select collection
- Quick save (no popup, just icon click)
- Context menu "Save to Brainly"

**manifest.json (v3)**:
```json
{
  "manifest_version": 3,
  "name": "Brainly - Save to Second Brain",
  "version": "1.0.0",
  "description": "Save any content to your Brainly second brain",
  "permissions": ["activeTab", "storage", "contextMenus"],
  "host_permissions": ["https://twitter.com/*", "https://youtube.com/*"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [{
    "matches": ["https://twitter.com/*", "https://youtube.com/*"],
    "js": ["content/content.js"]
  }]
}
```

**Authentication Flow**:
1. User clicks extension icon
2. If not logged in, show login form
3. Store JWT in extension storage
4. Use JWT for API calls

**Acceptance Criteria**:
- [ ] Chrome Web Store listing
- [ ] Firefox Add-ons listing
- [ ] One-click save from any page
- [ ] Auto-detect Twitter/YouTube
- [ ] Custom title before saving
- [ ] Tag selection
- [ ] Collection selection
- [ ] Success/error feedback

---

### 2.6 Content Type Expansion

**Description**: Support more content types beyond Twitter and YouTube.

**New Content Types**:
| Type | Detection | Embed Support |
|------|-----------|---------------|
| `article` | Any URL | Link preview card |
| `github` | github.com/* | Repo card with stars |
| `linkedin` | linkedin.com/posts/* | Post embed |
| `reddit` | reddit.com/* | Post embed |
| `podcast` | spotify.com/episode/* | Spotify embed |
| `document` | PDF URLs | PDF viewer |

**Database Changes**:
```typescript
const ContentSchema = new Schema({
  // ... existing fields
  type: {
    type: String,
    enum: ['twitter', 'youtube', 'article', 'github', 'linkedin', 'reddit', 'podcast', 'document'],
    default: 'article'
  },
  metadata: {
    thumbnail: String,
    description: String,
    author: String,
    publishedAt: Date,
    duration: Number,  // For videos/podcasts
    stars: Number,     // For GitHub repos
  }
});
```

**Link Preview Service**:
- Use OpenGraph meta tags
- Fallback to screenshot service
- Cache metadata

**Acceptance Criteria**:
- [ ] Auto-detect content type from URL
- [ ] Appropriate embed/preview for each type
- [ ] Metadata extraction (title, description, image)
- [ ] Type icon in sidebar filter
- [ ] Type badge on cards

---

## Phase 3: AI Differentiation

**Timeline**: Week 7-10
**Goal**: Add AI-powered features that differentiate Brainly

### 3.1 AI Content Summarization

**Description**: Automatically summarize saved content using AI.

**Implementation Options**:
| Provider | Pros | Cons |
|----------|------|------|
| OpenAI GPT-4 | Best quality | Expensive |
| Claude API | Great for long content | API limits |
| Llama (self-hosted) | Free, private | Infrastructure needed |
| OpenAI GPT-3.5 | Cheap, fast | Lower quality |

**Backend Service**:
```typescript
// services/summarizer.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function summarizeContent(content: string, type: string): Promise<string> {
  const prompt = type === 'youtube'
    ? 'Summarize this YouTube video transcript in 3-5 bullet points:'
    : 'Summarize this content in 3-5 bullet points:';

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{ role: 'user', content: `${prompt}\n\n${content}` }]
  });

  return response.content[0].text;
}
```

**Content Extraction**:
| Type | Extraction Method |
|------|-------------------|
| YouTube | YouTube Transcript API |
| Twitter | Twitter API / Scraping |
| Article | Readability.js / Mercury Parser |
| PDF | pdf-parse library |

**Database Changes**:
```typescript
const ContentSchema = new Schema({
  // ... existing fields
  summary: { type: String },
  summaryGeneratedAt: { type: Date },
  transcriptAvailable: { type: Boolean, default: false }
});
```

**Backend Endpoints**:
```
POST /api/v1/content/:id/summarize  - Generate summary
GET  /api/v1/content/:id/transcript - Get full transcript
```

**Frontend Components**:
```
src/components/ui/
├── SummaryCard.tsx       # Display summary with expand
├── SummarizeButton.tsx   # "Summarize" CTA
└── TranscriptView.tsx    # Full transcript modal
```

**UX Flow**:
1. User saves content
2. "Summarize" button appears on card
3. Click triggers async summarization
4. Loading state while processing
5. Summary appears in card (collapsible)

**Acceptance Criteria**:
- [ ] Summarize YouTube videos
- [ ] Summarize Twitter threads
- [ ] Summarize articles
- [ ] Summary displayed on card
- [ ] Expandable full summary
- [ ] Re-generate summary option
- [ ] Rate limiting (X summaries per day free)

---

### 3.2 Auto-Tagging with AI

**Description**: Automatically suggest and apply tags using AI.

**Implementation**:
```typescript
// services/tagger.ts
export async function suggestTags(content: {
  title: string;
  summary?: string;
  type: string;
}): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Suggest 3-5 relevant tags for this content. Return only comma-separated tags, no explanation.

Title: ${content.title}
Type: ${content.type}
${content.summary ? `Summary: ${content.summary}` : ''}

Tags:`
    }]
  });

  return response.content[0].text.split(',').map(t => t.trim().toLowerCase());
}
```

**UX Flow**:
1. User saves content
2. AI suggests tags in background
3. Tags appear as suggestions (greyed out)
4. User can accept/reject each tag
5. Accepted tags applied to content

**Frontend Component**:
```tsx
// TagSuggestions.tsx
<div className="flex gap-2 mt-2">
  <span className="text-xs text-brand-text-muted">Suggested:</span>
  {suggestedTags.map(tag => (
    <button
      key={tag}
      onClick={() => acceptTag(tag)}
      className="px-2 py-1 text-xs bg-brand-surface/50 rounded hover:bg-brand-surface"
    >
      + {tag}
    </button>
  ))}
</div>
```

**Acceptance Criteria**:
- [ ] Auto-suggest tags on new content
- [ ] User can accept/reject suggestions
- [ ] Learn from user preferences
- [ ] Suggest from existing tags first
- [ ] Fallback to AI suggestions

---

### 3.3 Semantic Search (Vector Search)

**Description**: Search by meaning, not just keywords.

**Architecture**:
```
User Query → Embedding Model → Vector DB → Similar Content
                                    ↑
Content → Embedding Model → Store Vector
```

**Technology Stack**:
| Component | Options |
|-----------|---------|
| Embedding Model | OpenAI text-embedding-3-small, Cohere, local models |
| Vector Database | Pinecone, Weaviate, Qdrant, pgvector |
| Hybrid Search | Combine keyword + semantic |

**Implementation with Pinecone**:
```typescript
// services/vectorSearch.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone();
const openai = new OpenAI();
const index = pinecone.index('brainly-content');

export async function indexContent(content: Content) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: `${content.title} ${content.summary || ''}`
  });

  await index.upsert([{
    id: content._id.toString(),
    values: embedding.data[0].embedding,
    metadata: {
      userId: content.userId.toString(),
      title: content.title,
      type: content.type
    }
  }]);
}

export async function semanticSearch(query: string, userId: string) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });

  const results = await index.query({
    vector: embedding.data[0].embedding,
    filter: { userId },
    topK: 10,
    includeMetadata: true
  });

  return results.matches;
}
```

**Search UX**:
- Toggle between "Keyword" and "Semantic" search
- Show relevance score
- "Find similar" button on each card

**Example Queries**:
- "that video about React state management" → finds React hooks tutorial
- "productivity tips from Naval" → finds Naval Ravikant tweets
- "machine learning basics" → finds ML content even if titled differently

**Acceptance Criteria**:
- [ ] Index all content on save
- [ ] Semantic search endpoint
- [ ] Relevance scoring
- [ ] "Find similar" feature
- [ ] Hybrid keyword + semantic search
- [ ] Fast response time (<500ms)

---

### 3.4 Chat with Your Brain

**Description**: Ask questions about your saved knowledge using AI.

**Architecture**:
```
User Question
     ↓
Semantic Search (find relevant content)
     ↓
Context Assembly (top 5-10 results)
     ↓
LLM with Context (generate answer)
     ↓
Response with Citations
```

**Backend Endpoint**:
```typescript
// POST /api/v1/brain/chat
app.post("/api/v1/brain/chat", userMiddleware, async (req, res) => {
  const { question } = req.body;
  const userId = req.userId;

  // 1. Find relevant content via semantic search
  const relevantContent = await semanticSearch(question, userId);

  // 2. Build context from content
  const context = relevantContent
    .map(c => `[${c.metadata.title}]: ${c.metadata.summary}`)
    .join('\n\n');

  // 3. Generate answer with citations
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    system: `You are a helpful assistant that answers questions based on the user's saved content.
             Always cite which content you're referencing. If you don't know, say so.`,
    messages: [{
      role: 'user',
      content: `Context from user's saved content:\n${context}\n\nQuestion: ${question}`
    }]
  });

  res.json({
    answer: response.content[0].text,
    sources: relevantContent.map(c => ({
      id: c.id,
      title: c.metadata.title
    }))
  });
});
```

**Frontend Component**:
```
src/components/ui/
├── BrainChat.tsx        # Main chat interface
├── ChatMessage.tsx      # Individual message
├── ChatInput.tsx        # Input with send button
└── SourceCitation.tsx   # Clickable source reference
```

**UI Design**:
- Floating chat button (bottom-right)
- Slide-out chat panel
- Message history (session-based initially)
- Source links in responses
- Suggested questions

**Example Interactions**:
```
User: "What did I save about React performance?"
AI: "Based on your saved content, you have several resources about React performance:

1. [React Performance Optimization Guide] discusses memo, useMemo, and useCallback
2. [Dan Abramov Tweet Thread] explains when NOT to optimize
3. [YouTube: React 18 Features] covers concurrent rendering

Key takeaways: Focus on measuring before optimizing, use React DevTools Profiler..."
```

**Acceptance Criteria**:
- [ ] Chat interface in dashboard
- [ ] Context-aware responses
- [ ] Source citations with links
- [ ] Conversation history (session)
- [ ] Suggested questions
- [ ] "I don't know" for out-of-context questions
- [ ] Rate limiting

---

### 3.5 Smart Notifications & Resurfacing

**Description**: Proactively resurface relevant saved content.

**Features**:
1. **Spaced Repetition**: Resurface content at optimal intervals
2. **Related Content**: "You saved something similar X days ago"
3. **Weekly Digest**: Email summary of saved knowledge
4. **Trending in Your Brain**: Most accessed content

**Database Schema**:
```typescript
const ContentInteractionSchema = new Schema({
  contentId: { type: ObjectId, ref: 'Content' },
  userId: { type: ObjectId, ref: 'User' },
  viewCount: { type: Number, default: 0 },
  lastViewed: { type: Date },
  nextReviewDate: { type: Date },  // Spaced repetition
  easeFactor: { type: Number, default: 2.5 }  // SM-2 algorithm
});
```

**Weekly Digest Email**:
```typescript
// jobs/weeklyDigest.ts
export async function sendWeeklyDigest(userId: string) {
  const user = await UserModel.findById(userId);
  const recentContent = await ContentModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);

  const aiSummary = await generateWeeklyInsights(recentContent);

  await sendEmail({
    to: user.email,
    subject: 'Your Weekly Brain Digest',
    template: 'weekly-digest',
    data: { user, recentContent, aiSummary }
  });
}
```

**Acceptance Criteria**:
- [ ] Daily "Review" notification
- [ ] Weekly email digest
- [ ] "You saved this X days ago" reminder
- [ ] Spaced repetition scheduling
- [ ] Notification preferences

---

## Phase 4: Growth & Virality

**Timeline**: Week 11-14
**Goal**: Add features that drive user acquisition and retention

### 4.1 Public Profiles

**Description**: Shareable user profiles showcasing their curated brain.

**New Routes**:
```
/u/:username           - Public profile page
/u/:username/collections - User's public collections
```

**Database Changes**:
```typescript
const UserSchema = new Schema({
  // ... existing fields
  bio: { type: String, maxlength: 160 },
  website: { type: String },
  twitter: { type: String },
  isPublic: { type: Boolean, default: false },
  publicStats: {
    contentCount: Number,
    collectionCount: Number,
    followerCount: Number
  }
});
```

**Profile Page Features**:
- Profile picture, username, bio
- Social links
- Public collections
- Total saves count
- "Follow" button
- Share profile button

**SEO**:
- Server-side rendering for profiles
- OpenGraph meta tags
- JSON-LD structured data

**Acceptance Criteria**:
- [ ] Public profile page
- [ ] Customizable bio
- [ ] Social links
- [ ] Public/private toggle
- [ ] Share profile URL
- [ ] SEO-friendly

---

### 4.2 Follow System

**Description**: Follow other users to see their public saves.

**Database Schema**:
```typescript
const FollowSchema = new Schema({
  follower: { type: ObjectId, ref: 'User', required: true },
  following: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
```

**Backend Endpoints**:
```
POST   /api/v1/users/:id/follow   - Follow user
DELETE /api/v1/users/:id/follow   - Unfollow user
GET    /api/v1/users/:id/followers - Get followers
GET    /api/v1/users/:id/following - Get following
GET    /api/v1/feed               - Get feed from followed users
```

**Feed Algorithm**:
1. Get all followed users
2. Fetch their recent public content
3. Sort by recency/relevance
4. Paginate results

**Acceptance Criteria**:
- [ ] Follow/unfollow users
- [ ] Followers/following counts
- [ ] Following feed
- [ ] "Discover" page for finding users
- [ ] Notification on new follower

---

### 4.3 Discover & Explore

**Description**: Discover interesting public brains and collections.

**Features**:
- Trending collections
- Featured curators
- Topic-based discovery
- "Similar to you" recommendations

**Backend Endpoints**:
```
GET /api/v1/discover/trending      - Trending public content
GET /api/v1/discover/collections   - Popular collections
GET /api/v1/discover/curators      - Featured users
GET /api/v1/discover/topics/:topic - Content by topic
```

**Algorithm Factors**:
- Recent saves
- Follower count
- Content engagement
- Collection completeness
- Curator activity

**Acceptance Criteria**:
- [ ] Trending page
- [ ] Topic categories
- [ ] Featured curators
- [ ] "For You" recommendations
- [ ] Search users/collections

---

### 4.4 Social Sharing

**Description**: Easy sharing to social platforms.

**Share Options**:
- Twitter/X card with preview
- LinkedIn post
- Copy link
- Embed code for blogs

**OpenGraph Tags**:
```html
<meta property="og:title" content="My React Resources - Brainly" />
<meta property="og:description" content="A curated collection of React tutorials and articles" />
<meta property="og:image" content="https://brainly.app/og/collection-123.png" />
<meta property="og:url" content="https://brainly.app/c/react-resources" />
```

**Dynamic OG Images**:
- Generate preview images for collections
- Use Vercel OG or similar
- Include collection name, item count, curator

**Acceptance Criteria**:
- [ ] Twitter card preview
- [ ] LinkedIn sharing
- [ ] Embed code generation
- [ ] Dynamic OG images
- [ ] Share analytics

---

### 4.5 Referral System

**Description**: Incentivize users to invite others.

**Mechanics**:
- Unique referral link per user
- Reward: Extra AI credits, premium features
- Two-sided rewards (referrer + referee)

**Database Schema**:
```typescript
const ReferralSchema = new Schema({
  referrer: { type: ObjectId, ref: 'User' },
  referee: { type: ObjectId, ref: 'User' },
  code: { type: String, unique: true },
  status: { type: String, enum: ['pending', 'completed'] },
  reward: { type: String },
  createdAt: { type: Date, default: Date.now }
});
```

**Rewards**:
| Milestone | Referrer Gets | Referee Gets |
|-----------|---------------|--------------|
| Sign up | 10 AI credits | 10 AI credits |
| 7-day active | 1 month premium | - |
| 10 referrals | Lifetime premium | - |

**Acceptance Criteria**:
- [ ] Unique referral links
- [ ] Referral tracking
- [ ] Reward distribution
- [ ] Referral dashboard
- [ ] Social sharing of referral links

---

## Phase 5: Platform & Monetization

**Timeline**: Week 15+
**Goal**: Build sustainable business model

### 5.1 Premium Tiers

**Pricing Structure**:

| Feature | Free | Pro ($8/mo) | Team ($15/user/mo) |
|---------|------|-------------|-------------------|
| Content saves | 100/mo | Unlimited | Unlimited |
| AI summaries | 10/mo | 100/mo | Unlimited |
| AI chat questions | 5/mo | 50/mo | Unlimited |
| Collections | 3 | Unlimited | Unlimited |
| Browser extension | Basic | Full | Full |
| API access | - | 1000 calls/mo | Unlimited |
| Team workspace | - | - | Yes |
| Priority support | - | Yes | Yes |
| Custom branding | - | - | Yes |

**Implementation**:
- Stripe integration for payments
- Usage tracking middleware
- Feature flags per tier
- Upgrade prompts at limits

**Database Schema**:
```typescript
const SubscriptionSchema = new Schema({
  userId: { type: ObjectId, ref: 'User' },
  tier: { type: String, enum: ['free', 'pro', 'team'] },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  currentPeriodEnd: { type: Date },
  usage: {
    saves: { type: Number, default: 0 },
    summaries: { type: Number, default: 0 },
    chatQuestions: { type: Number, default: 0 }
  },
  usageResetDate: { type: Date }
});
```

**Acceptance Criteria**:
- [ ] Stripe checkout integration
- [ ] Subscription management
- [ ] Usage tracking
- [ ] Upgrade/downgrade flow
- [ ] Billing portal
- [ ] Invoice generation

---

### 5.2 Team Workspaces

**Description**: Shared knowledge bases for teams.

**Features**:
- Shared collections
- Team members management
- Role-based permissions
- Activity feed
- Team-wide search

**Database Schema**:
```typescript
const WorkspaceSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  owner: { type: ObjectId, ref: 'User' },
  members: [{
    user: { type: ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'editor', 'viewer'] },
    joinedAt: { type: Date, default: Date.now }
  }],
  settings: {
    allowPublicCollections: Boolean,
    defaultRole: String
  }
});

// Add to ContentSchema
workspaceId: { type: ObjectId, ref: 'Workspace' }
```

**Permissions**:
| Role | View | Add | Edit | Delete | Manage Members |
|------|------|-----|------|--------|----------------|
| Viewer | Yes | No | No | No | No |
| Editor | Yes | Yes | Yes | Own | No |
| Admin | Yes | Yes | Yes | Yes | Yes |

**Acceptance Criteria**:
- [ ] Create/manage workspaces
- [ ] Invite members
- [ ] Role-based permissions
- [ ] Shared collections
- [ ] Team activity feed
- [ ] Team billing

---

### 5.3 API Access

**Description**: Public API for developers to build on Brainly.

**API Features**:
- REST API with OpenAPI spec
- API key management
- Rate limiting by tier
- Webhooks for events

**Endpoints**:
```
GET    /api/public/v1/content
POST   /api/public/v1/content
DELETE /api/public/v1/content/:id
GET    /api/public/v1/search
GET    /api/public/v1/collections
POST   /api/public/v1/summarize
```

**API Key Management**:
```typescript
const ApiKeySchema = new Schema({
  userId: { type: ObjectId, ref: 'User' },
  key: { type: String, unique: true },
  name: { type: String },
  permissions: [{ type: String }],
  rateLimit: { type: Number, default: 1000 },
  usage: { type: Number, default: 0 },
  lastUsed: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
```

**Documentation**:
- Interactive API docs (Swagger UI)
- Code examples in multiple languages
- SDKs for popular languages
- Postman collection

**Acceptance Criteria**:
- [ ] API key generation
- [ ] Rate limiting
- [ ] Usage dashboard
- [ ] API documentation
- [ ] Webhooks

---

### 5.4 Mobile Apps

**Description**: Native iOS and Android apps.

**Technology Options**:
| Option | Pros | Cons |
|--------|------|------|
| React Native | Code sharing with web | Performance |
| Flutter | Single codebase, good performance | Different language |
| Native (Swift/Kotlin) | Best performance | Two codebases |

**Recommendation**: React Native (Expo) for faster development and code sharing.

**Mobile-Specific Features**:
- Share sheet integration (save from any app)
- Offline mode
- Push notifications
- Widget for quick save
- Biometric authentication

**Acceptance Criteria**:
- [ ] iOS app on App Store
- [ ] Android app on Play Store
- [ ] Share sheet integration
- [ ] Offline support
- [ ] Push notifications

---

### 5.5 Integrations

**Description**: Connect with other productivity tools.

**Priority Integrations**:
| Integration | Type | Value |
|-------------|------|-------|
| Notion | Import/Export | Migrate existing users |
| Obsidian | Sync | Power users |
| Readwise | Import | Reader migration |
| Pocket | Import | Reader migration |
| Zapier | Automation | Power users |
| Slack | Share | Team productivity |
| Discord | Share | Community |

**Zapier Triggers**:
- New content saved
- New collection created
- Content summarized

**Zapier Actions**:
- Save content to Brainly
- Add tags to content
- Search brain

**Acceptance Criteria**:
- [ ] Notion import
- [ ] Pocket import
- [ ] Zapier integration
- [ ] Slack integration
- [ ] IFTTT integration

---

## Technical Specifications

### Technology Stack (Recommended Evolution)

**Current**:
- Backend: Express.js + TypeScript + MongoDB
- Frontend: React 19 + Vite + Tailwind CSS

**Recommended Additions**:
| Component | Current | Recommended |
|-----------|---------|-------------|
| ORM | Mongoose | Mongoose (keep) |
| Validation | None | Zod |
| API Docs | None | Swagger/OpenAPI |
| Caching | None | Redis |
| Queue | None | BullMQ |
| Search | MongoDB text | Elasticsearch or Meilisearch |
| Vector DB | None | Pinecone or Qdrant |
| File Storage | None | S3/Cloudflare R2 |
| Email | None | Resend or SendGrid |
| Monitoring | None | Sentry + Datadog |
| CI/CD | None | GitHub Actions |
| Hosting | Local | Vercel + Railway/Render |

### Folder Structure (Recommended)

**Backend**:
```
Brainly/
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Content.ts
│   │   ├── Collection.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── content.ts
│   │   ├── collections.ts
│   │   ├── brain.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── validation.ts
│   ├── services/
│   │   ├── summarizer.ts
│   │   ├── vectorSearch.ts
│   │   ├── email.ts
│   │   └── scraper.ts
│   ├── jobs/
│   │   ├── weeklyDigest.ts
│   │   └── indexContent.ts
│   └── utils/
│       ├── helpers.ts
│       └── constants.ts
├── tests/
├── .env.example
└── package.json
```

**Frontend**:
```
brainly-frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config/
│   │   └── index.ts
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Profile.tsx
│   │   ├── Collection.tsx
│   │   ├── Discover.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── features/
│   ├── hooks/
│   │   ├── useUser.ts
│   │   ├── useContents.ts
│   │   ├── useCollections.ts
│   │   └── useSearch.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── stores/
│   │   └── authStore.ts
│   └── types/
│       └── index.ts
├── public/
└── package.json
```

---

## Database Schema Evolution

### Phase 1 Additions
```typescript
// No new models, just fixes to existing
```

### Phase 2 Additions
```typescript
// Collection model
// Tag changes (embedded strings)
// Content: add collectionId, updatedAt
```

### Phase 3 Additions
```typescript
// Content: add summary, embedding
// ContentInteraction model
// ChatHistory model (optional)
```

### Phase 4 Additions
```typescript
// Follow model
// User: add bio, isPublic, social links
```

### Phase 5 Additions
```typescript
// Subscription model
// Workspace model
// ApiKey model
// WorkspaceMember model
```

---

## API Endpoints Roadmap

### Phase 1 (Fix)
- No new endpoints, fix existing

### Phase 2 (Core)
```
GET    /api/v1/content/search
PUT    /api/v1/content/:id
POST   /api/v1/content/:id/tags
DELETE /api/v1/content/:id/tags/:tag
GET    /api/v1/tags
POST   /api/v1/collections
GET    /api/v1/collections
PUT    /api/v1/collections/:id
DELETE /api/v1/collections/:id
POST   /api/v1/content/:id/move
```

### Phase 3 (AI)
```
POST   /api/v1/content/:id/summarize
GET    /api/v1/content/:id/transcript
POST   /api/v1/search/semantic
POST   /api/v1/brain/chat
GET    /api/v1/brain/digest
```

### Phase 4 (Social)
```
GET    /api/v1/users/:username
POST   /api/v1/users/:id/follow
DELETE /api/v1/users/:id/follow
GET    /api/v1/users/:id/followers
GET    /api/v1/users/:id/following
GET    /api/v1/feed
GET    /api/v1/discover/trending
GET    /api/v1/discover/curators
```

### Phase 5 (Business)
```
POST   /api/v1/subscriptions
GET    /api/v1/subscriptions/portal
POST   /api/v1/workspaces
GET    /api/v1/workspaces
POST   /api/v1/workspaces/:id/members
GET    /api/v1/api-keys
POST   /api/v1/api-keys
DELETE /api/v1/api-keys/:id
```

---

## Security Checklist

### Authentication & Authorization
- [ ] JWT expiration implemented
- [ ] Refresh token mechanism
- [ ] Password strength requirements
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Secure password reset flow

### Input Validation
- [ ] Zod schemas for all endpoints
- [ ] XSS prevention
- [ ] SQL/NoSQL injection prevention
- [ ] File upload validation
- [ ] URL validation for content links

### Data Protection
- [ ] HTTPS everywhere
- [ ] Sensitive data encryption at rest
- [ ] PII handling compliance
- [ ] GDPR compliance (EU users)
- [ ] Data export functionality
- [ ] Account deletion

### Infrastructure
- [ ] Environment variables secured
- [ ] Secrets management (Vault/AWS Secrets)
- [ ] DDoS protection
- [ ] WAF configured
- [ ] Security headers (helmet.js)
- [ ] CORS properly configured

### Monitoring & Response
- [ ] Error tracking (Sentry)
- [ ] Audit logging
- [ ] Anomaly detection
- [ ] Incident response plan
- [ ] Regular security audits

---

## Success Metrics

### User Metrics
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- User retention (D1, D7, D30)
- Content saves per user
- Session duration

### Engagement Metrics
- Search queries per user
- AI features usage
- Share rate
- Collection creation rate
- Browser extension installs

### Business Metrics
- Free to paid conversion rate
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Net Promoter Score (NPS)

---

## Conclusion

This roadmap transforms Brainly from a basic bookmark manager into an **AI-powered knowledge platform**. The key differentiator is the combination of:

1. **Easy capture** (browser extension, any content type)
2. **AI understanding** (summaries, auto-tags, semantic search)
3. **Active retrieval** (chat, spaced repetition, digests)
4. **Social discovery** (public profiles, following, collections)

The billion-dollar opportunity is in becoming the **"second brain that thinks with you"** — not just passive storage, but active knowledge partnership.

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Brainly Development Team*
