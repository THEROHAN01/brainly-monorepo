# Brainly Backend

A TypeScript/Express.js backend API for Brainly - a personal knowledge management application for saving and organizing Twitter and YouTube content.

## Features

- **User Authentication**
  - Local authentication with username/password (bcrypt hashing)
  - Google OAuth integration
  - JWT-based session management (7-day expiry)

- **Content Management**
  - Save Twitter and YouTube links with titles
  - Organize content with custom tags
  - Filter content by type
  - Delete saved content

- **Tags System**
  - Create, list, and delete personal tags
  - Assign multiple tags to content
  - Tags are user-scoped (each user has their own tags)

- **Brain Sharing**
  - Generate shareable links to your saved content
  - Public access to shared brains (no auth required)
  - Toggle sharing on/off

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 4
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose 8
- **Authentication:** JWT, bcrypt, Google OAuth (google-auth-library)
- **Validation:** Zod

## Project Structure

```
Brainly/
├── src/
│   ├── index.ts      # Express server, API routes, validation schemas
│   ├── db.ts         # Mongoose models (User, Content, Tag, Link) and DB connection
│   ├── middleware.ts # JWT authentication middleware
│   ├── utils.ts      # Utility functions (random hash generator)
│   └── types.d.ts    # TypeScript type extensions
├── dist/             # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── .env
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
JWT_SECRET=your-secret-key-here
MONGO_URI=mongodb://localhost:27017/brainly

# Optional
PORT=5000                              # Default: 5000
CORS_ORIGIN=http://localhost:5173      # Default: http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id # Required for Google OAuth
```

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/signup` | No | Register with username/password |
| POST | `/api/v1/signin` | No | Login with username/password |
| POST | `/api/v1/auth/google` | No | Login/register with Google OAuth |
| GET | `/api/v1/me` | Yes | Get current user profile |

### Content

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/content` | Yes | Create new content |
| GET | `/api/v1/content` | Yes | Get all user's content |
| DELETE | `/api/v1/content` | Yes | Delete content by ID |
| PUT | `/api/v1/content/:contentId/tags` | Yes | Update tags on content |

### Tags

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/tags` | Yes | Get all user's tags |
| POST | `/api/v1/tags` | Yes | Create a new tag |
| DELETE | `/api/v1/tags/:tagId` | Yes | Delete a tag |

### Sharing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/brain/share` | Yes | Create or delete share link |
| GET | `/api/v1/brain/:shareLink` | No | View shared brain content |

## Database Models

### User
- `username` - Unique username
- `email` - Email address (for Google OAuth)
- `password` - Bcrypt hashed password
- `googleId` - Google OAuth ID
- `profilePicture` - Profile image URL
- `authProvider` - 'local' or 'google'
- `createdAt` - Account creation timestamp

### Content
- `title` - Content title
- `link` - URL to Twitter/YouTube content
- `type` - 'twitter' or 'youtube'
- `tags` - Array of Tag references
- `userId` - Reference to User

### Tag
- `name` - Tag name (lowercase, unique per user)
- `userId` - Reference to User
- `createdAt` - Creation timestamp

### Link
- `hash` - 10-character random share link
- `userId` - Reference to User (unique - one link per user)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm run start

# Or build and start in one command
npm run dev
```

### Scripts

```bash
npm run build    # Compile TypeScript to dist/
npm run start    # Run compiled server (dist/index.js)
npm run dev      # Build and start
```

## Request Examples

### Signup
```bash
curl -X POST http://localhost:5000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "secret123"}'
```

### Create Content
```bash
curl -X POST http://localhost:5000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Great thread on productivity",
    "link": "https://twitter.com/user/status/123",
    "type": "twitter",
    "tags": ["tag-id-1", "tag-id-2"]
  }'
```

### Create Tag
```bash
curl -X POST http://localhost:5000/api/v1/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "productivity"}'
```

## License

ISC License
