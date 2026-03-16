# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brainly is a "second brain" application — a personal knowledge management tool. It consists of:
- **backend/** - Express.js + TypeScript backend with MongoDB
- **frontend/** - React 19 + TypeScript + Vite frontend with Tailwind CSS v4

## Common Commands

### Backend (backend/)
```bash
cd backend
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled server (dist/index.js)
npm run dev        # Build and start (npm run build && npm run start)
```

### Frontend (frontend/)
```bash
cd frontend
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## Architecture

### Backend Structure
- `src/index.ts` - Express server entry point; all route definitions; rate limiting; CORS
- `src/db.ts` - Mongoose schemas (User, Content, Link, Tag) and MongoDB connection
- `src/middleware.ts` - JWT authentication middleware (`userMiddleware`)
- `src/config.ts` - Centralised env var loading and validation
- `src/logger.ts` - Pino logger instance
- `src/utils.ts` - Utility functions (random hash, etc.)
- `src/types.d.ts` - Express `Request` type augmentation (`req.userId`)
- `src/providers/` - Content provider system for URL parsing and type detection
- `src/extractors/` - Metadata enrichment extractors (per-platform scrapers)
- `src/services/enrichment.service.ts` - Orchestrates extractor selection and enrichment

**API Endpoints:**
- `POST /api/v1/signup` - User registration (bcrypt password hashing)
- `POST /api/v1/signin` - User login (returns JWT)
- `POST /api/v1/auth/google` - Google OAuth sign-in / sign-up (returns JWT)
- `POST /api/v1/content` - Create content (protected; auto-detects type via provider system)
- `POST /api/v1/content/validate` - Validate URL and return preview info (protected)
- `GET  /api/v1/content` - Get authenticated user's content (protected)
- `DELETE /api/v1/content` - Delete content by ID (protected)
- `GET  /api/v1/content/providers` - List all supported content providers
- `GET  /api/v1/tags` - Get authenticated user's tags (protected)
- `POST /api/v1/tags` - Create a new tag (protected)
- `DELETE /api/v1/tags/:tagId` - Delete a tag by ID (protected)
- `PUT  /api/v1/content/:contentId/tags` - Update tags on a content item (protected)
- `POST /api/v1/brain/share` - Create or revoke shareable brain link (protected)
- `GET  /api/v1/brain/:shareLink` - Get shared brain content (public)
- `GET  /api/v1/me` - Get authenticated user profile (protected)

**Database Models:**
- `User` - username (unique), password (hashed), googleId (optional)
- `Content` - title, link, contentId, type, tags[], userId, metadata, createdAt
- `Tag` - name, userId (tags are user-scoped)
- `Link` - hash, userId (ref to User) — shareable brain link

### Content Provider System

Plugin-based provider architecture for URL detection and type assignment.

**Provider locations:**
- Backend: `backend/src/providers/`
- Frontend: `frontend/src/providers/`

**Current providers (backend + frontend mirrors):**
- `youtube` - YouTube videos (watch, shorts, live, embed, youtu.be)
- `twitter` - Twitter/X posts (twitter.com, x.com)
- `instagram` - Instagram posts and reels
- `github` - GitHub repositories and profiles
- `medium` - Medium articles
- `notion` - Notion pages and databases
- `generic` - Fallback for any other URL

**Adding new providers:** See `docs/provider-system/ADDING_NEW_PROVIDER.md`.

### Enrichment / Extractor System

When content is saved, `enrichment.service.ts` selects an extractor based on content type and fetches metadata (title, description, author, thumbnail, etc.).

**Extractor locations:** `backend/src/extractors/`
- `youtube.extractor.ts` - Uses Innertube player API (no API key required)
- `twitter.extractor.ts` - Scrapes Twitter/X embed endpoint
- `instagram.extractor.ts` - Scrapes Instagram oEmbed
- `github.extractor.ts` - Uses GitHub REST API (`GITHUB_TOKEN` optional)
- `medium.extractor.ts` - Scrapes Medium article metadata
- `generic.extractor.ts` - HTML metadata (Open Graph, title tag)
- `base.ts` - Abstract base extractor interface
- `registry.ts` - Maps content type → extractor
- `safe-fetch.ts` - Fetch wrapper with timeout and error handling
- `html-utils.ts` - DOM parsing helpers

### Frontend Structure
- `src/App.tsx` - React Router setup
- `src/main.tsx` - App entry point
- `src/pages/` - Page components: Landing, Signup, Signin, Dashboard, SharedBrain
- `src/components/ui/` - Reusable UI components (Button, Card, Input, Sidebar, CreateContentModal, ConfirmDialog, Dialog, UserAvatar, EmptyState, CardSkeleton, TagBadge, TagInput, Spinner, SidebarItem, GoogleSignInButton)
- `src/components/magicui/` - MagicUI animation components (BlurFade, BorderBeam, MagicCard, TextShimmer, GridPattern, DotPattern, Particles, ShimmerButton)
- `src/components/ProtectedRoute.tsx` - Auth guard for protected routes
- `src/hooks/` - Custom hooks: useContents, useUser, useTags
- `src/lib/api.ts` - Axios instance with JWT request interceptor + 401 redirect
- `src/lib/auth.ts` - Token helpers: getToken, setToken, removeToken, getAuthHeaders
- `src/providers/` - Frontend content provider mirrors
- `src/icons/` - SVG icon components
- `src/config.ts` - BACKEND_URL constant from env

**Routing:**
- `/` - Landing page
- `/signup` - User registration
- `/signin` - User login
- `/dashboard` - Main app interface (protected)
- `/share/:shareLink` - Public shared brain view


## Environment Variables

### Backend (backend/.env)
```
MONGO_URI=             # MongoDB connection string (required)
PORT=3000              # Server port (default: 3000)
JWT_SECRET=            # Secret for signing JWTs (required)
GOOGLE_CLIENT_ID=      # Google OAuth client ID (required for Google sign-in)
CORS_ORIGIN=           # Allowed CORS origin, e.g. http://localhost:5173
YOUTUBE_API_KEY=       # YouTube Data API v3 key (optional; extractor uses Innertube fallback)
GITHUB_TOKEN=          # GitHub personal access token (optional; increases rate limit)
TWITTER_BEARER_TOKEN=  # Twitter API bearer token (optional; for enriched tweet metadata)
LOG_LEVEL=info         # Pino log level (trace|debug|info|warn|error)
```

### Frontend (frontend/.env)
```
VITE_BACKEND_URL=      # Backend base URL, e.g. http://localhost:3000
VITE_GOOGLE_CLIENT_ID= # Google OAuth client ID (must match backend)
```

## Key Technologies
- Backend: Express 4, Mongoose 8, JWT (jsonwebtoken), bcrypt, Pino, express-rate-limit
- Frontend: React 19, React Router 7, Tailwind CSS 4, Vite 7, Axios, CVA (class-variance-authority), sonner (toasts), MagicUI
