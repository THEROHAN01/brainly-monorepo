---
title: Pages
description: The page-level components — Landing, Signup, Signin, Dashboard, and SharedBrain.
---

## Landing (`pages/Landing.tsx`)

The full marketing landing page (~734 lines). Sections:

- **Navbar** — logo, nav links, CTA buttons, mobile hamburger with animated drawer.
- **Hero** — headline with `TextShimmer`, subheading, two CTAs, mockup with `BorderBeam`.
- **Platform carousel** — scrolling badges for YouTube, Twitter, GitHub, Medium, Instagram, any URL.
- **Bento grid** — 8 feature cards using `MagicCard` hover effect.
- **How It Works** — 3-step numbered guide.
- **Testimonials** — 3 cards with 5-star ratings.
- **Value props callout** and **CTA section**.
- **Footer** — links and social icons.

Uses `GridPattern`, `TextShimmer`, `BlurFade`, `BorderBeam`, and `MagicCard` from
MagicUI.

## Signup (`pages/Signup.tsx`)

Registration form with username/password fields, client-side validation (password
6+ chars), and a `GoogleSignInButton`. On success: sets an inline success state
prompting the user to sign in. On error: displays the API error message.

## Signin (`pages/Signin.tsx`)

Login form with username/password and a `GoogleSignInButton`. On success: calls
`setToken(jwt)` + redirect to `/dashboard`.

## Dashboard (`pages/dashboard.tsx`)

The main application interface (~340 lines).

State:

| State | Purpose |
| --- | --- |
| `modalOpen` | Controls `CreateContentModal` visibility |
| `sidebarOpen` | Mobile sidebar drawer open/close |
| `filter` | Active type filter (`all`, `youtube`, etc.) |
| `searchQuery` | Text search string |
| `sortBy` | Active sort option |
| `deleteConfirm` | Delete confirmation dialog state + target contentId |
| `sharing` | Loading state for the share toggle |
| `shareActive` | Whether the brain is currently shared |

Data hooks: `useContents()`, `useUser()`, `useTags()`.

**Keyboard shortcuts:** `Ctrl/Cmd+K` opens the Add Content modal; `Esc` closes
modal/dialog; `/` focuses the search input.

**Filtering & sorting pipeline** (pure client-side):

1. Filter by `content.type === filter` (unless `filter === "all"`).
2. Filter by search query against `title`, `link`, and `tags[].name`.
3. Sort by `date-desc`, `date-asc`, `title-asc`, `title-desc`, or `type`.

**Share brain flow:**

- `shareActive = false` → POST `/api/v1/brain/share { share: true }` → copy URL to clipboard → `shareActive = true`.
- `shareActive = true` → POST `/api/v1/brain/share { share: false }` → `shareActive = false`.

**Content grid:** `1 col → sm:2 → lg:3 → xl:4`.

## SharedBrain (`pages/SharedBrain.tsx`)

Public read-only view at `/share/:shareLink`. Fetches
`GET /api/v1/brain/:shareLink`, displays a username header + read-only content
grid using `Card`, and shows an error state if the link is invalid or revoked.
