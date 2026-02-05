# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brainly is a "second brain" application - a personal knowledge management tool. It consists of:
- **Brainly/** - Express.js + TypeScript backend with MongoDB
- **brainly-frontend/** - React 19 + TypeScript + Vite frontend with Tailwind CSS v4

## Common Commands

### Backend (Brainly/)
```bash
cd Brainly
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled server (dist/index.js)
npm run dev        # Build and start (npm run build && npm run start)
```

### Frontend (brainly-frontend/)
```bash
cd brainly-frontend
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## Architecture

### Backend Structure
- `src/index.ts` - Express server with all API routes
- `src/db.ts` - Mongoose schemas (User, Content, Link, Tag) and MongoDB connection
- `src/middleware.ts` - JWT authentication middleware (`userMiddleware`)
- `src/providers/` - Content provider system for URL parsing and validation
- `src/utils.ts` - Utility functions

**API Endpoints:**
- `POST /api/v1/signup` - User registration (bcrypt password hashing)
- `POST /api/v1/signin` - User login (returns JWT)
- `POST /api/v1/content` - Create content (protected, auto-detects type from URL)
- `POST /api/v1/content/validate` - Validate URL and get preview info (protected)
- `GET /api/v1/content` - Get user's content (protected)
- `DELETE /api/v1/content` - Delete content by ID (protected)
- `GET /api/v1/content/providers` - List supported content providers
- `POST /api/v1/brain/share` - Create/delete shareable link (protected)
- `GET /api/v1/brain/:shareLink` - Get shared brain content (public)

**Database Models:**
- `User` - username (unique), password (hashed)
- `Content` - title, link, contentId, type, tags, userId, metadata
- `Tag` - name, userId (user-specific tags)
- `Link` - hash, userId (ref to User) - for shareable brain links

### Content Provider System

The app uses a **plugin-based provider architecture** for URL handling. Each content type (YouTube, Twitter, generic links) is a separate provider module.

**Provider locations:**
- Backend: `Brainly/src/providers/`
- Frontend: `brainly-frontend/src/providers/`

**Current providers:**
- `youtube` - YouTube videos (watch, shorts, live, embed, youtu.be)
- `twitter` - Twitter/X posts (twitter.com, x.com)
- `link` - Generic fallback for any URL

**Adding new providers:** See `docs/provider-system/ADDING_NEW_PROVIDER.md` for complete instructions on adding support for new content types (Spotify, Notion, Reddit, etc.).

### Frontend Structure
- `src/App.tsx` - React Router setup with routes for /, /signup, /signin, /dashboard
- `src/pages/` - Page components (Landing, Signup, Signin, Dashboard)
- `src/components/ui/` - Reusable UI components (Button, Card, Input, Sidebar, CreateContentModal)
- `src/icons/` - Icon components
- `src/index.css` - Tailwind CSS styles

**Routing:**
- `/` - Landing page
- `/signup` - User registration
- `/signin` - User login
- `/dashboard` - Main app interface (protected)


## Environment Variables

### Backend (Brainly/.env)
- `MONGO_URI` - MongoDB connection string (required)
- `PORT` - Server port (default: 3000)

## Key Technologies
- Backend: Express 4, Mongoose 8, JWT, bcrypt
- Frontend: React 19, React Router 7, Tailwind CSS 4, Vite 7
