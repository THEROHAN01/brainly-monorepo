# Brainly Frontend

A React 19 + TypeScript frontend for Brainly - a personal knowledge management application for saving and organizing Twitter and YouTube content.

## Features

- **Authentication**
  - Local sign up/sign in with username and password
  - Google OAuth integration
  - Protected routes with automatic redirect
  - User profile with avatar dropdown

- **Content Management**
  - Save Twitter threads and YouTube videos
  - Embedded previews (Twitter widget, YouTube iframe)
  - Delete content with confirmation dialog
  - Filter content by type (All, Twitter, YouTube)

- **Tags System**
  - Create and manage personal tags
  - Add tags when creating content
  - Tag autocomplete with inline creation
  - Visual tag badges on content cards

- **Brain Sharing**
  - Generate shareable public links
  - Copy share link to clipboard
  - Public view for shared brains

- **UI/UX**
  - Dark theme with green accent colors
  - Responsive sidebar navigation
  - Animated transitions (blur fade, shimmer effects)
  - Loading states and error handling
  - Empty state guidance

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 (with @tailwindcss/vite)
- **Routing:** React Router 7
- **HTTP Client:** Axios
- **UI Components:** Radix UI (Dialog, Popover)
- **Animations:** Motion (Framer Motion)
- **OAuth:** @react-oauth/google

## Project Structure

```
brainly-frontend/
├── src/
│   ├── main.tsx              # App entry point, GoogleOAuthProvider
│   ├── App.tsx               # Router configuration
│   ├── config.ts             # Environment variables
│   ├── index.css             # Tailwind imports, custom styles, animations
│   ├── pages/
│   │   ├── Landing.tsx       # Marketing landing page
│   │   ├── Signup.tsx        # User registration
│   │   ├── Signin.tsx        # User login
│   │   ├── dashboard.tsx     # Main app interface
│   │   └── SharedBrain.tsx   # Public shared brain view
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarItem.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── CreateContentModal.tsx
│   │   │   ├── TagInput.tsx
│   │   │   ├── TagBadge.tsx
│   │   │   ├── UserAvatar.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── GoogleSignInButton.tsx
│   │   └── magicui/          # Animated UI components
│   │       ├── blur-fade.tsx
│   │       ├── border-beam.tsx
│   │       ├── dot-pattern.tsx
│   │       ├── grid-pattern.tsx
│   │       ├── magic-card.tsx
│   │       ├── particles.tsx
│   │       ├── shimmer-button.tsx
│   │       └── text-shimmer.tsx
│   ├── hooks/
│   │   ├── useUser.ts        # User authentication state
│   │   ├── useContents.tsx   # Content fetching and management
│   │   └── useTags.tsx       # Tags CRUD operations
│   ├── icons/                # SVG icon components
│   ├── lib/
│   │   └── utils.ts          # cn() utility for class merging
│   └── types/
│       └── tag.ts            # Tag interface
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Backend API URL
VITE_BACKEND_URL=http://localhost:5000

# Google OAuth Client ID (optional - for Google Sign-In)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Routes

| Path | Component | Protection | Description |
|------|-----------|------------|-------------|
| `/` | Landing | Public | Marketing landing page |
| `/signup` | Signup | Public | User registration |
| `/signin` | Signin | Public | User login |
| `/dashboard` | Dashboard | Protected | Main app interface |
| `/share/:shareLink` | SharedBrain | Public | View shared brain |

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see Brainly backend)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Scripts

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

## Key Components

### Authentication Flow
1. User lands on `/signin` or `/signup`
2. On successful auth, JWT token stored in `localStorage`
3. `ProtectedRoute` validates token via `/api/v1/me` endpoint
4. Invalid/expired token redirects to `/signin`

### Content Cards
- Display embedded Twitter widgets (using Twitter's widget.js)
- Display embedded YouTube players (iframe)
- Show assigned tags as badges
- Delete with confirmation overlay

### Tag Management
- `TagInput` component with autocomplete dropdown
- Create new tags inline while typing
- Tags stored server-side, scoped to user

## Styling

Uses Tailwind CSS 4 with custom theme variables:

- `brand-primary`: #08CB00 (green accent)
- `brand-bg`: #000000 (dark background)
- `brand-surface`: #253900 (card backgrounds)
- `brand-text`: #EEEEEE (primary text)
- `brand-text-muted`: #888888 (secondary text)

Custom animations defined in `index.css`:
- Blur fade, float, pulse glow
- Shimmer effects, border beam
- Scale transitions

## License

MIT License
