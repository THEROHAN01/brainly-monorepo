# Tags Feature - Frontend Documentation

## Overview

The Tags feature provides a complete UI for users to create, manage, and apply tags to their saved content. It includes autocomplete tag selection, inline tag creation, tag badges on content cards, and a tags overview in the sidebar.

## Why This Feature?

### User Problems Solved
- **Organization** - Users can categorize content by topic
- **Discovery** - Tags make it easier to find related content
- **Context** - Tags provide at-a-glance understanding of content topics

### UX Goals
- Seamless tag creation (no separate "manage tags" page)
- Autocomplete to reduce typing and ensure consistency
- Visual tag badges for quick scanning
- Non-intrusive tag display

---

## Architecture Overview

```
src/
├── types/
│   └── tag.ts                    # Tag interface
├── hooks/
│   └── useTags.tsx               # Tag CRUD hook
├── icons/
│   └── TagIcon.tsx               # Tag icon component
├── components/ui/
│   ├── TagBadge.tsx              # Tag pill display
│   └── TagInput.tsx              # Autocomplete tag selector
├── pages/
│   └── dashboard.tsx             # Wires everything together
└── (modified files)
    ├── components/ui/Card.tsx            # Shows tags on cards
    ├── components/ui/CreateContentModal.tsx  # Tag selection
    ├── components/ui/Sidebar.tsx         # Tags list
    └── hooks/useContents.tsx             # Content type updated
```

---

## New Files

### 1. `src/types/tag.ts`

**Purpose:** TypeScript interface for Tag objects

```typescript
export interface Tag {
    _id: string;
    name: string;
    userId: string;
    createdAt: string;
}
```

**Why a separate types folder?**
- Clean separation of concerns
- Reusable across components and hooks
- Easy to extend with additional types
- Follows TypeScript best practices

---

### 2. `src/hooks/useTags.tsx`

**Purpose:** Custom hook for tag CRUD operations

**Exports:**
```typescript
export function useTags() {
    return {
        tags: Tag[],              // All user's tags (sorted alphabetically)
        loading: boolean,         // True while fetching
        error: string | null,     // Error message if fetch failed
        refetch: () => void,      // Manually refresh tags
        createTag: (name: string) => Promise<Tag | null>,  // Create new tag
        deleteTag: (tagId: string) => Promise<void>        // Delete tag
    };
}
```

**Key Features:**

1. **Auto-fetch on mount:**
```typescript
useEffect(() => {
    fetchTags();
}, [fetchTags]);
```

2. **Optimistic updates for createTag:**
```typescript
const createTag = async (name: string): Promise<Tag | null> => {
    const response = await axios.post(...);
    const newTag = response.data.tag;
    // Add to local state immediately, sorted
    setTags(prev => [...prev, newTag].sort((a, b) =>
        a.name.localeCompare(b.name)
    ));
    return newTag;
};
```

3. **Handle duplicate tags gracefully:**
```typescript
catch (err: any) {
    // If tag already exists (409), return the existing tag
    if (err.response?.status === 409) {
        return err.response.data.tag;
    }
    throw err;
}
```

**Why this pattern?**
- `createTag` returns the tag so caller can use it immediately
- 409 (conflict) returns existing tag - enables "create or get" pattern
- Sorted insertion keeps UI consistent

---

### 3. `src/icons/TagIcon.tsx`

**Purpose:** SVG tag icon matching existing icon system

```typescript
import type { IconProps } from ".";
import { iconSizeVariants } from ".";

export const TagIcon = (props: IconProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className={iconSizeVariants[props.size]}
        >
            <path ... />
        </svg>
    );
};
```

**Why follow existing pattern?**
- Consistent with other icons (ShareIcon, TrashIcon, etc.)
- Uses shared `iconSizeVariants` for size consistency
- Same prop interface for easy swapping

**Also updated:** `src/icons/index.ts` to export TagIcon

---

### 4. `src/components/ui/TagBadge.tsx`

**Purpose:** Display a tag as a pill/badge

**Props:**
```typescript
interface TagBadgeProps {
    name: string;           // Tag text to display
    onRemove?: () => void;  // Optional remove callback (shows X button)
    size?: "sm" | "md";     // Size variant (default: "sm")
}
```

**Usage Examples:**
```tsx
// Display only (on cards)
<TagBadge name="llm" />

// With remove button (in tag input)
<TagBadge name="tech" onRemove={() => handleRemove(tag._id)} />

// Larger size
<TagBadge name="machine-learning" size="md" />
```

**Styling:**
```typescript
const sizeClasses = size === "sm"
    ? "text-xs px-2 py-0.5"
    : "text-sm px-2.5 py-1";

// Base classes
className={`inline-flex items-center gap-1 bg-brand-surface
    text-brand-text rounded-full ${sizeClasses}`}
```

**Design Decisions:**
- Rounded pill shape for visual distinction
- Small by default to not overwhelm content
- Remove button only shown when `onRemove` provided
- `e.stopPropagation()` prevents card click when removing

---

### 5. `src/components/ui/TagInput.tsx`

**Purpose:** Autocomplete tag selector with inline creation

**Props:**
```typescript
interface TagInputProps {
    availableTags: Tag[];                           // All user's tags
    selectedTags: Tag[];                            // Currently selected tags
    onTagsChange: (tags: Tag[]) => void;           // Callback when selection changes
    onCreateTag: (name: string) => Promise<Tag | null>;  // Create new tag
    placeholder?: string;                           // Input placeholder
}
```

**Component Structure:**
```
┌─────────────────────────────────────────┐
│ [llm ×] [tech ×]                        │  ← Selected tags (removable)
├─────────────────────────────────────────┤
│ Add tags...                             │  ← Text input
├─────────────────────────────────────────┤
│ machine-learning                        │  ← Suggestion dropdown
│ ml                                      │
│ ─────────────────────────────────────── │
│ Create "transformer"                    │  ← Create new option
└─────────────────────────────────────────┘
```

**Key Features:**

1. **Autocomplete filtering:**
```typescript
const filteredTags = availableTags.filter(
    tag =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.some(st => st._id === tag._id)  // Exclude selected
);
```

2. **"Create new" option:**
```typescript
const exactMatch = availableTags.find(
    t => t.name.toLowerCase() === inputValue.trim().toLowerCase()
);
const canCreateNew = inputValue.trim().length > 0 && !exactMatch;
```

3. **Keyboard support:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
        e.preventDefault();
        if (filteredTags.length > 0) {
            handleSelectTag(filteredTags[0]);  // Select first match
        } else if (canCreateNew) {
            handleCreateTag();  // Create new tag
        }
    }
};
```

4. **Click outside to close:**
```typescript
useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

**UX Considerations:**
- Input stays focused after selecting a tag
- Loading state while creating ("Creating...")
- Selected tags shown above input for clarity
- Suggestions only show when input focused AND has content or suggestions

---

## Modified Files

### 1. `src/hooks/useContents.tsx`

**Changes:**
- Added `Tag` type import
- Added `tags: Tag[]` to `Content` interface

```typescript
import type { Tag } from "../types/tag";

export interface Content {
    _id: string;
    title: string;
    link: string;
    type: "twitter" | "youtube";
    userId: string;
    tags: Tag[];  // NEW
}
```

**Why?**
- Backend now returns populated tags with content
- Frontend needs type safety for tag display

---

### 2. `src/components/ui/CreateContentModal.tsx`

**Changes:**

1. **New imports:**
```typescript
import { TagInput } from "./TagInput";
import type { Tag } from "../../types/tag";
```

2. **Extended props:**
```typescript
interface CreateContentModalProps {
    open: boolean;
    onClose: () => void;
    onContentAdded?: () => void;
    availableTags: Tag[];                           // NEW
    onCreateTag: (name: string) => Promise<Tag | null>;  // NEW
}
```

3. **New state:**
```typescript
const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
```

4. **Updated API call:**
```typescript
await axios.post(`${BACKEND_URL}/api/v1/content`, {
    link,
    title,
    type,
    tags: selectedTags.map(t => t._id)  // NEW - send tag IDs
}, { ... });
```

5. **Reset on success:**
```typescript
setSelectedTags([]);  // Clear selected tags after submit
```

6. **TagInput in form:**
```tsx
<div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-700">Tags</label>
    <TagInput
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        onCreateTag={onCreateTag}
        placeholder="Add tags (e.g., llm, tech)"
    />
</div>
```

---

### 3. `src/components/ui/Card.tsx`

**Changes:**

1. **New imports:**
```typescript
import { TagBadge } from "./TagBadge";
import type { Tag } from "../../types/tag";
```

2. **Extended props:**
```typescript
interface CardProps {
    contentId: string;
    title: string;
    link: string;
    type: "twitter" | "youtube";
    tags?: Tag[];  // NEW - optional for backwards compatibility
    onDelete?: (id: string) => Promise<void>;
}
```

3. **Updated function signature:**
```typescript
export function Card({ contentId, title, link, type, tags, onDelete }: CardProps) {
```

4. **Tags display (after title, before embed):**
```tsx
{/* Tags */}
{tags && tags.length > 0 && (
    <div className="flex flex-wrap gap-1 mt-2">
        {tags.map(tag => (
            <TagBadge key={tag._id} name={tag.name} size="sm" />
        ))}
    </div>
)}
```

**Design Decisions:**
- Tags are optional (`tags?`) for backwards compatibility
- Small badges to not overwhelm the card
- Flex wrap handles multiple tags gracefully
- Placed below title for visual hierarchy

---

### 4. `src/components/ui/Sidebar.tsx`

**Changes:**

1. **New imports:**
```typescript
import { TagIcon } from "../../icons/TagIcon";
import type { Tag } from "../../types/tag";
```

2. **Extended props:**
```typescript
interface SidebarProps {
    filter?: FilterType;
    onFilterChange?: (filter: FilterType) => void;
    tags?: Tag[];  // NEW
}
```

3. **Updated function signature:**
```typescript
export function Sidebar({ filter = "all", onFilterChange, tags }: SidebarProps) {
```

4. **Added overflow-y-auto** to container (for many tags):
```tsx
<div className="h-screen ... overflow-y-auto">
```

5. **Tags section:**
```tsx
{/* Tags Section */}
{tags && tags.length > 0 && (
    <div className="pt-6 pl-4 pr-4">
        <div className="flex items-center gap-2 text-brand-text-muted text-sm font-medium mb-3">
            <TagIcon size="sm" />
            <span>Your Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-2">
            {tags.map(tag => (
                <span
                    key={tag._id}
                    className="text-xs px-2 py-1 bg-brand-surface text-brand-text rounded-full"
                >
                    {tag.name}
                </span>
            ))}
        </div>
    </div>
)}
```

**Design Decisions:**
- Only shows when user has tags
- Uses TagIcon for visual consistency
- Smaller pills than TagBadge (no remove button needed)
- Overflow handling for users with many tags

---

### 5. `src/pages/dashboard.tsx`

**Changes:**

1. **New import:**
```typescript
import { useTags } from '../hooks/useTags';
```

2. **Hook usage:**
```typescript
const { tags: availableTags, createTag } = useTags();
```

3. **Updated CreateContentModal:**
```tsx
<CreateContentModal
    open={modalOpen}
    onClose={() => setModalOpen(false)}
    onContentAdded={refetch}
    availableTags={availableTags}  // NEW
    onCreateTag={createTag}        // NEW
/>
```

4. **Updated Card:**
```tsx
<Card
    key={content._id}
    contentId={content._id}
    type={content.type}
    link={content.link}
    title={content.title}
    tags={content.tags}  // NEW
    onDelete={handleDeleteContent}
/>
```

5. **Updated Sidebar:**
```tsx
<Sidebar
    filter={filter}
    onFilterChange={setFilter}
    tags={availableTags}  // NEW
/>
```

---

### 6. `src/pages/SharedBrain.tsx`

**Changes:**
- Added `contentId` prop to Card component (required after Card refactor)

```tsx
<Card
    key={content._id}
    contentId={content._id}  // NEW - required prop
    type={content.type}
    link={content.link}
    title={content.title}
/>
```

**Note:** SharedBrain doesn't pass tags because the shared brain API doesn't populate them (and users can't edit shared content anyway).

---

## Data Flow

### Creating Content with Tags

```
User Action                    Component                   API
───────────────────────────────────────────────────────────────
1. Open modal          →   CreateContentModal opens
2. Type tag            →   TagInput shows suggestions
3. Select existing     →   selectedTags updated
4. Type new tag        →   "Create new" option shown
5. Press Enter         →   onCreateTag called        → POST /api/v1/tags
6. Tag created         ←   New tag returned          ←
7. Tag auto-selected   →   selectedTags updated
8. Click "Add Content" →   addContent called         → POST /api/v1/content
9. Content created     ←   Success response          ←
10. Modal closes       →   selectedTags reset
11. Cards refresh      →   refetch called            → GET /api/v1/content
```

### Viewing Tags

```
Component Mount                Dashboard
───────────────────────────────────────────
1. useContents()      →   Fetches content with populated tags
2. useTags()          →   Fetches all user tags
3. Render Cards       →   Each card displays its tags as badges
4. Render Sidebar     →   Shows all tags in "Your Tags" section
```

---

## Styling Details

### TagBadge Styles
```css
/* Base */
inline-flex items-center gap-1
bg-brand-surface text-brand-text rounded-full

/* Size: sm */
text-xs px-2 py-0.5

/* Size: md */
text-sm px-2.5 py-1

/* Remove button hover */
hover:text-brand-primary transition-colors
```

### TagInput Dropdown Styles
```css
/* Container */
absolute z-10 w-full mt-1
bg-brand-bg border border-brand-surface
rounded-lg shadow-lg max-h-48 overflow-y-auto

/* Option */
w-full px-3 py-2 text-left text-sm text-brand-text
hover:bg-brand-surface transition-colors

/* Create option */
text-brand-primary border-t border-brand-surface
```

### Sidebar Tags Section
```css
/* Header */
flex items-center gap-2
text-brand-text-muted text-sm font-medium mb-3

/* Tag pills */
text-xs px-2 py-1
bg-brand-surface text-brand-text rounded-full
```

---

## Future Enhancements

### Phase 2: Tag Filtering
- Click tag in sidebar to filter content
- Multi-tag filter support
- Clear filter option

### Phase 3: Tag Management
- "Manage Tags" modal to rename/delete tags
- Tag merge functionality
- Tag usage statistics

### Phase 4: Enhanced UX
- Drag-and-drop tag reordering
- Tag color customization
- Recently used tags section
- Tag suggestions based on content

---

## Testing Checklist

### Manual Testing
- [ ] Create new tag via TagInput
- [ ] Select existing tag from autocomplete
- [ ] Remove tag from selection
- [ ] Create content with tags
- [ ] View tags on content cards
- [ ] View tags in sidebar
- [ ] Tags persist after page refresh
- [ ] Duplicate tag creation returns existing tag
- [ ] Empty tag name rejected
- [ ] Long tag name (50+ chars) rejected

### Edge Cases
- [ ] No tags created yet - UI handles gracefully
- [ ] Many tags (20+) - sidebar scrolls
- [ ] Long tag names - badges truncate or wrap
- [ ] Network error during tag creation
- [ ] Rapid tag creation (debouncing)
