# Adding a New Content Provider

This guide explains how to add support for a new content type (e.g., Spotify, Notion, Reddit, Instagram) to the Brainly provider system.

## Overview

The provider system uses a plugin architecture. Each content type is a separate module that implements the `ContentProvider` interface. When a URL is submitted, the system tries each registered provider until one matches.

## Quick Reference

| Step | Backend | Frontend |
|------|---------|----------|
| 1 | Create `Brainly/src/providers/{name}.provider.ts` | Create `brainly-frontend/src/providers/{name}.provider.ts` |
| 2 | Register in `Brainly/src/providers/index.ts` | Register in `brainly-frontend/src/providers/index.ts` |
| 3 | (Optional) Add sidebar icon | Add to `Sidebar.tsx` FilterType and add icon |

## Step-by-Step Guide

### Step 1: Create the Backend Provider

Create a new file: `Brainly/src/providers/{name}.provider.ts`

```typescript
/**
 * {Name} Content Provider
 *
 * Handles {Name} URL formats:
 * - List the URL patterns this provider handles
 */

import { ContentProvider } from './base';

/** Valid hostnames for this provider */
const {NAME}_HOSTNAMES = [
    '{domain}.com',
    'www.{domain}.com',
    // Add all valid hostnames
];

export const {name}Provider: ContentProvider = {
    // Unique identifier - used in database and filtering
    type: '{name}',

    // Display name shown in UI
    displayName: '{Name}',

    // List of hostnames this provider handles
    hostnames: {NAME}_HOSTNAMES,

    // Whether this content can be embedded visually
    supportsEmbed: true, // or false

    // How to render the embed:
    // - 'iframe': Direct iframe embedding (YouTube, Spotify)
    // - 'oembed': Uses external widget/API (Twitter)
    // - 'card': Link preview card
    // - 'none': No visual embed
    embedType: 'iframe',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname);
    },

    extractId(url: URL): string | null {
        // Extract the unique content identifier from the URL
        // Return null if URL format is invalid

        // Example: Extract ID from path
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
            return pathParts[1]; // Adjust based on URL structure
        }
        return null;
    },

    getEmbedUrl(contentId: string): string {
        // Return the embed URL for this content
        // Only implement if supportsEmbed is true
        return `https://{domain}.com/embed/${contentId}`;
    },

    getCanonicalUrl(contentId: string): string {
        // Return the canonical/shareable URL for this content
        return `https://{domain}.com/{path}/${contentId}`;
    }
};
```

### Step 2: Register the Backend Provider

Edit `Brainly/src/providers/index.ts`:

```typescript
// Add import at the top
import { {name}Provider } from './{name}.provider';

// Add to providers array BEFORE genericProvider
const providers: ContentProvider[] = [
    youtubeProvider,
    twitterProvider,
    {name}Provider,  // <-- Add here
    genericProvider, // Always last
];

// Add to exports at the bottom
export { youtubeProvider, twitterProvider, {name}Provider, genericProvider };
```

### Step 3: Create the Frontend Provider

Create `brainly-frontend/src/providers/{name}.provider.ts` with the same logic as backend.

**Important:** Use `import type { ContentProvider }` (not `import { ContentProvider }`) due to TypeScript's `verbatimModuleSyntax`.

```typescript
import type { ContentProvider } from './base';

// Same implementation as backend
export const {name}Provider: ContentProvider = {
    // ... same as backend
};
```

### Step 4: Register the Frontend Provider

Edit `brainly-frontend/src/providers/index.ts`:

```typescript
// Add import
import { {name}Provider } from './{name}.provider';

// Add to providers array BEFORE genericProvider
const providers: ContentProvider[] = [
    youtubeProvider,
    twitterProvider,
    {name}Provider,  // <-- Add here
    genericProvider,
];

// Add to exports
export { youtubeProvider, twitterProvider, {name}Provider, genericProvider };
```

### Step 5: Add Sidebar Filter (Optional)

If users should be able to filter by this content type, edit `brainly-frontend/src/components/ui/Sidebar.tsx`:

1. Update the FilterType:
```typescript
export type FilterType = "all" | "twitter" | "youtube" | "link" | "{name}";
```

2. Create an icon component:
```typescript
function {Name}Icon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Add SVG path */}
        </svg>
    );
}
```

3. Add the SidebarItem:
```typescript
<SidebarItem
    text="{Name}"
    icon={<{Name}Icon />}
    isActive={filter === "{name}"}
    onClick={() => onFilterChange?.("{name}")}
/>
```

### Step 6: Add Type Badge Color (Optional)

For custom colors in the CreateContentModal type badge, edit `brainly-frontend/src/components/ui/CreateContentModal.tsx`:

```typescript
const colorClasses: Record<string, string> = {
    youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
    twitter: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    {name}: 'bg-{color}-500/20 text-{color}-400 border-{color}-500/30', // <-- Add
    link: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};
```

## Provider Interface Reference

```typescript
interface ContentProvider {
    type: string;           // Unique identifier (stored in DB)
    displayName: string;    // Shown in UI
    hostnames: string[];    // Valid hostnames
    supportsEmbed: boolean; // Can be embedded?
    embedType: 'iframe' | 'oembed' | 'card' | 'none';

    canHandle(url: URL): boolean;           // Check if URL matches
    extractId(url: URL): string | null;     // Extract content ID
    getEmbedUrl?(contentId: string): string; // Generate embed URL
    getCanonicalUrl(contentId: string): string; // Generate shareable URL
}
```

## Common Provider Examples

### Spotify (iframe embed)
- Hostnames: `open.spotify.com`
- URL pattern: `open.spotify.com/track/{id}`, `open.spotify.com/album/{id}`
- Embed URL: `https://open.spotify.com/embed/track/{id}`

### Reddit (oembed)
- Hostnames: `reddit.com`, `www.reddit.com`, `old.reddit.com`
- URL pattern: `reddit.com/r/{subreddit}/comments/{id}/{slug}`
- Uses Reddit's oEmbed API

### Notion (iframe)
- Hostnames: `notion.so`, `notion.site`, `*.notion.site`
- URL pattern: `notion.so/{workspace}/{page-id}`
- Embed URL: `https://notion.so/{page-id}`

### Medium (card only)
- Hostnames: `medium.com`, `*.medium.com`
- No embed support, shows as link card

## Testing Checklist

After adding a provider:

1. [ ] Backend builds: `cd Brainly && npm run build`
2. [ ] Frontend builds: `cd brainly-frontend && npm run build`
3. [ ] URL is correctly detected and type badge shows
4. [ ] Content ID is extracted correctly
5. [ ] Embed preview works (if applicable)
6. [ ] Content saves successfully
7. [ ] Content displays correctly in dashboard
8. [ ] Sidebar filter works (if added)

## File Locations

```
Brainly/
├── src/providers/
│   ├── base.ts              # Interfaces (don't modify)
│   ├── index.ts             # Registry (add import + registration)
│   ├── youtube.provider.ts  # Reference implementation
│   ├── twitter.provider.ts  # Reference implementation
│   ├── generic.provider.ts  # Fallback (don't modify)
│   └── {name}.provider.ts   # YOUR NEW PROVIDER

brainly-frontend/
├── src/providers/
│   ├── base.ts              # Interfaces (don't modify)
│   ├── index.ts             # Registry (add import + registration)
│   ├── youtube.provider.ts  # Reference implementation
│   ├── twitter.provider.ts  # Reference implementation
│   ├── generic.provider.ts  # Fallback (don't modify)
│   └── {name}.provider.ts   # YOUR NEW PROVIDER
├── src/components/ui/
│   ├── Sidebar.tsx          # Add filter (optional)
│   └── CreateContentModal.tsx # Add badge color (optional)
```
