---
title: Components
description: The UI component library, the auth guard, and the MagicUI visual effects.
---

## ProtectedRoute (`components/ProtectedRoute.tsx`)

Auth guard. Checks `getToken()` and calls `useUser()`:

- No token → redirect to `/signin`.
- User fetch fails (401) → redirect to `/signin`.
- Shows a loading spinner while verifying.
- On success → renders `children`.

## UI components (`components/ui/`)

### Card

The content card. Renders every content type:

- **YouTube** — `<iframe>` embed with `youtube.com/embed/{contentId}`.
- **Twitter/X** — Twitter widget script + `<blockquote class="twitter-tweet">`, calls `window.twttr.widgets.load()`.
- **Instagram** — oEmbed-style card.
- **GitHub / Medium / Notion / link** — link card with provider icon, title, URL.
- Action buttons: Copy link, Delete (`onDelete` callback), Share.

### Dialog

Low-level accessible dialog primitive built on Radix UI `@radix-ui/react-dialog`.
Exported sub-components:

| Export | Role |
| --- | --- |
| `Dialog` | Root state manager (controlled or uncontrolled) |
| `DialogTrigger` | Element that opens the dialog |
| `DialogPortal` | Renders children into a React portal |
| `DialogOverlay` | Full-screen dark backdrop with fade animation |
| `DialogContent` | Centered modal panel with zoom+slide animation |
| `DialogHeader` / `DialogFooter` | Layout wrappers |
| `DialogTitle` / `DialogDescription` | Accessible heading/subtitle |
| `DialogClose` | Element that closes the dialog |

### Other UI components

| Component | Role |
| --- | --- |
| `Button` | Variants (`primary`/`secondary`/`danger`), sizes, `loading`, `glow`, icons |
| `Input` / `PasswordInput` | Text input + password input with visibility toggle |
| `GoogleSignInButton` | Wraps `useGoogleLogin`; POSTs to `/api/v1/auth/google` |
| `CreateContentModal` | Save-content dialog with URL validation + tag multi-select |
| `Sidebar` | Type filters + tag list; drawer on mobile |
| `SidebarItem` | Single filter/nav button (icon + label) |
| `ConfirmDialog` | Generic confirmation modal (used for delete) |
| `EmptyState` | Shown when the user has no content |
| `CardSkeleton` / `CardSkeletonGrid` | Loading skeletons |
| `UserAvatar` | Profile picture or initials + logout dropdown |
| `TagBadge` | Pill-style tag chip with optional × |
| `TagInput` | Multi-select tag input (select existing or create new) |
| `Spinner` | CSS spinner for loading states |

## MagicUI (`components/magicui/`)

Animation and visual-effect primitives used on the landing page.

| Component | Effect |
| --- | --- |
| `BlurFade` | Staggered fade-in with blur on scroll into view |
| `BorderBeam` | Animated glowing border that rotates around an element |
| `DotPattern` | Repeating dot background pattern |
| `GridPattern` | Repeating grid/line background pattern |
| `MagicCard` | Card with mouse-tracked gradient hover glow |
| `Particles` | Floating particle animation |
| `ShimmerButton` | Button with animated shimmer overlay |
| `TextShimmer` | Text with animated color shimmer sweep |

All exported from `magicui/index.ts`.
