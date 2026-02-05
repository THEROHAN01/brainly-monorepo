# Brainly Monorepo

A personal knowledge management tool - your "second brain" for storing and organizing content from across the web.

## Overview

This monorepo contains both the frontend and backend codebases for Brainly, unified from separate repositories while preserving complete git history.

## Project Structure

```
brainly-monorepo/
├── frontend/          # React 19 + TypeScript + Vite frontend
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   └── ...
└── backend/           # Express + MongoDB + TypeScript backend
    ├── src/
    ├── package.json
    ├── .env.example
    └── ...
```

## Tech Stack

### Frontend
- React 19 with React Router 7
- TypeScript
- Vite 7 (build tool)
- Tailwind CSS 4
- Axios for API calls

### Backend
- Express 4
- TypeScript
- MongoDB with Mongoose 8
- JWT authentication
- bcrypt for password hashing
- Google OAuth integration

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- MongoDB database (local or Atlas)
- Google OAuth Client ID (for authentication)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your credentials:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   CORS_ORIGIN=http://localhost:5173
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   PORT=5000
   ```

5. Build and start the server:
   ```bash
   npm run build
   npm run start
   ```

The backend will be running at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your backend URL and Google Client ID:
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be running at `http://localhost:5173`

## Environment Variables

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `CORS_ORIGIN` | Allowed CORS origin (frontend URL) | `http://localhost:5173` |
| `JWT_SECRET` | Secret key for JWT token signing | `your_secure_secret_here` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | `xxxxx.apps.googleusercontent.com` |
| `PORT` | Server port | `5000` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Backend API base URL | `http://localhost:5000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | `xxxxx.apps.googleusercontent.com` |

## Available Commands

### Backend Commands
```bash
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled server (dist/index.js)
npm run dev        # Build and start (npm run build && npm run start)
```

### Frontend Commands
```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## API Endpoints

### Authentication
- `POST /api/v1/signup` - User registration
- `POST /api/v1/signin` - User login (returns JWT)

### Content Management
- `POST /api/v1/content` - Create content (protected)
- `POST /api/v1/content/validate` - Validate URL and get preview (protected)
- `GET /api/v1/content` - Get user's content (protected)
- `DELETE /api/v1/content` - Delete content by ID (protected)
- `GET /api/v1/content/providers` - List supported content providers

### Brain Sharing
- `POST /api/v1/brain/share` - Create/delete shareable link (protected)
- `GET /api/v1/brain/:shareLink` - Get shared brain content (public)

## Features

- User authentication (username/password + Google OAuth)
- Content saving with automatic type detection
- Support for YouTube, Twitter/X, and generic links
- Tag-based organization
- Brain sharing with shareable links
- Provider system for extensible content types

## Repository History

This monorepo was created by merging two separate repositories while preserving complete git history:
- Frontend: 22 commits from brainly-frontend
- Backend: 34 commits from Brainly

For details on the migration process, see [MIGRATION.md](./MIGRATION.md).

## Project Documentation

- Frontend README: [frontend/README.md](./frontend/README.md)
- Backend Documentation: [backend/CLAUDE.md](./backend/CLAUDE.md)
- Provider System: [frontend/docs/provider-system/](./frontend/docs/provider-system/)
- Product Roadmap: [frontend/PRODUCT_ROADMAP.md](./frontend/PRODUCT_ROADMAP.md)

## License

See individual package directories for license information.
