# UI Elevation Plan: shadcn/ui + Magic UI

## Overview

Elevate Brainly's UI using **shadcn/ui** for core components and **Magic UI** for animations/effects. This combines shadcn's accessible, well-tested components with Magic UI's stunning visual effects.

## Current State

| Aspect | Status |
|--------|--------|
| **Components** | 12 custom components (Button, Card, Input, Sidebar, etc.) |
| **Design System** | Dark theme with green accent (#08CB00 / brand-primary) |
| **Animations** | Extensive custom CSS (pulse, float, grid-fade, etc.) |
| **Stack** | React 19 + Vite 7 + Tailwind CSS v4 |

## Compatibility Notes

### React 19 + Tailwind v4 Requirements

| Library | Requirement |
|---------|-------------|
| **shadcn/ui** | Use `@shadcn/ui@canary` version |
| **Animations** | Use `tw-animate-css` instead of `tailwindcss-animate` |
| **Magic UI** | Use `motion` package (not framer-motion) |

---

## Phase 1: Setup & Foundation

### 1.1 Install Dependencies

```bash
# Radix UI primitives (shadcn foundation)
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-slot

# Utility libraries
npm install class-variance-authority clsx tailwind-merge

# Animation libraries
npm install tw-animate-css motion
```

### 1.2 Create Utility File

**New file: `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 1.3 Update CSS Variables

**Modify: `src/index.css`**

Add shadcn-compatible CSS variables mapped to existing brand colors:

```css
:root {
  --background: 220 20% 6%;           /* brand-bg */
  --foreground: 0 0% 95%;             /* brand-text */
  --primary: 116 100% 40%;            /* brand-primary #08CB00 */
  --primary-foreground: 220 20% 6%;
  --card: 220 15% 10%;                /* brand-surface */
  --card-foreground: 0 0% 95%;
  --muted: 220 15% 15%;
  --muted-foreground: 0 0% 60%;
  --border: 220 15% 15%;
  --ring: 116 100% 40%;
}
```

---

## Phase 2: Core Components (shadcn/ui)

### Component Migration Table

| Current Component | Replace With | Priority |
|-------------------|--------------|----------|
| `Button.tsx` | shadcn button with variants | High |
| `Input.tsx` | shadcn input | High |
| `Card.tsx` | shadcn card + MagicCard hover | High |
| `CreateContentModal.tsx` | shadcn Dialog | High |
| `TagInput.tsx` | shadcn Popover + Command | Medium |
| `Sidebar.tsx` | shadcn sidebar | Medium |

### Key Changes

- Use `cn()` utility for class merging
- Radix UI primitives for accessibility (focus traps, keyboard navigation)
- Keep **brand-primary (#08CB00)** as primary color
- Maintain **dark theme** throughout

### Button Component

Enhanced with shadcn patterns:

```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-brand-primary text-brand-bg hover:bg-brand-primary/90",
        secondary: "bg-brand-surface text-brand-text hover:bg-brand-surface/80",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost: "hover:bg-brand-surface",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)
```

### Dialog Component

Replace CreateContentModal with Radix Dialog:

```typescript
import * as DialogPrimitive from "@radix-ui/react-dialog"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = DialogPrimitive.Overlay
const DialogContent = DialogPrimitive.Content
const DialogClose = DialogPrimitive.Close
```

Benefits:
- Automatic focus trap
- ESC to close
- Click outside to close
- ARIA compliant

---

## Phase 3: Magic UI Effects

### Landing Page

| Effect | Component | Location |
|--------|-----------|----------|
| Animated grid | `<GridPattern />` | Hero background |
| Glowing text | `<TextShimmer />` | "Your Second Brain" heading |
| Particles | `<Particles />` | Background accent |
| Border glow | `<BorderBeam />` | Feature cards |
| Typing animation | `<TypingAnimation />` | Tagline |

### Dashboard

| Effect | Component | Location |
|--------|-----------|----------|
| Fade in | `<BlurFade />` | Card entrance animations |
| Hover effect | `<MagicCard />` | Content cards |
| Shimmer | `<ShimmerButton />` | Primary CTAs |
| Counter | `<NumberTicker />` | Content count |

### Auth Pages (Signin/Signup)

| Effect | Component | Location |
|--------|-----------|----------|
| Background | `<DotPattern />` | Page background |
| Form entrance | `<BlurFade />` | Form animation |
| Card border | `<BorderBeam />` | Form card glow |

---

## Phase 4: Implementation Order

1. **Setup** - Dependencies, utils.ts, CSS variables
2. **Button** - Foundation component used everywhere
3. **Input** - Form foundation
4. **Dialog** - Replace CreateContentModal
5. **Card + MagicCard** - Content cards with hover effects
6. **Landing Page** - Magic UI effects (biggest visual impact)
7. **Auth Pages** - Polish signin/signup
8. **Dashboard** - Card animations
9. **Sidebar** - Final polish
10. **TagInput** - Popover enhancement

---

## Files to Create

### Utilities

```
src/lib/utils.ts
```

### Magic UI Components

```
src/components/magicui/
├── grid-pattern.tsx
├── particles.tsx
├── text-shimmer.tsx
├── border-beam.tsx
├── blur-fade.tsx
├── shimmer-button.tsx
├── magic-card.tsx
├── dot-pattern.tsx
├── typing-animation.tsx
└── number-ticker.tsx
```

---

## Files to Modify

### Core Components

```
src/components/ui/
├── Button.tsx        → shadcn patterns, cn() utility
├── Input.tsx         → shadcn patterns
├── Card.tsx          → shadcn + MagicCard hover
└── CreateContentModal.tsx → Use Dialog primitive
```

### Pages

```
src/pages/
├── Landing.tsx       → Magic UI effects
├── Signin.tsx        → Enhanced styling
├── Signup.tsx        → Enhanced styling
└── dashboard.tsx     → Card animations
```

### Styles

```
src/index.css         → CSS variables, tw-animate-css
```

---

## Magic UI Component Examples

### BlurFade (Card Entrance)

```typescript
import { motion } from "motion"

export function BlurFade({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  )
}
```

### BorderBeam (Card Glow)

```typescript
export function BorderBeam({ className }) {
  return (
    <div className={cn(
      "absolute inset-0 rounded-lg",
      "bg-gradient-to-r from-transparent via-brand-primary to-transparent",
      "animate-border-beam",
      className
    )} />
  )
}
```

### GridPattern (Landing Background)

```typescript
export function GridPattern() {
  return (
    <svg className="absolute inset-0 h-full w-full">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(8,203,0,0.1)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  )
}
```

---

## Verification Checklist

| Check | Command/Action |
|-------|----------------|
| Build passes | `npm run build` |
| Visual check | All pages render correctly |
| Animations | Landing page effects work |
| Accessibility | Keyboard navigation on modals |
| Dark theme | Consistent styling throughout |
| Mobile | Responsive on all breakpoints |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes | Incremental component-by-component approach |
| Visual regressions | Test each change before moving to next |
| Brand identity loss | Preserve green accent, dark theme throughout |
| Bundle size | Import only needed components |

---

## Expected Outcome

- **Professional feel** - shadcn's polished, accessible components
- **Visual wow factor** - Magic UI's stunning animations
- **Better UX** - Improved keyboard navigation, focus states
- **Maintained identity** - Same dark theme, green accent, Brainly brand
- **Modern stack** - Latest React 19 + Tailwind v4 compatibility
