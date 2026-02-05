# Brainly Brand Guidelines

## Color Palette

### Primary Colors

```css
Brand Green:  #08CB00  /* Bright green accent - primary actions */
Brand Dark:   #253900  /* Dark green background */
Brand Darker: #1a2600  /* Even darker green - alternative background */
Brand Black:  #000000  /* Pure black - main background */
Brand Light:  #EEEEEE  /* Light gray - text on dark backgrounds */
```

### Color Usage by Context

#### Dark Theme (Primary Application Theme)
The application uses a dark theme throughout with the following color applications:

**Backgrounds:**
- Main page background: `bg-brand-black` (#000000)
- Card backgrounds: `bg-brand-black` (#000000)
- Secondary backgrounds: `bg-brand-dark` (#253900)
- Hover states: `bg-brand-dark` (#253900)

**Borders:**
- Default borders: `border-brand-dark` (#253900)
- Accent borders: `border-brand-green` (#08CB00)

**Text:**
- Primary text: `text-brand-light` (#EEEEEE)
- Headings on dark: `text-brand-light` (#EEEEEE)
- Logo/accent text: `text-brand-green` (#08CB00)

**Interactive Elements:**
- Primary buttons: `bg-brand-green` with `text-brand-black`
- Secondary buttons: `bg-brand-dark` with `text-brand-light` and `border-brand-green`
- Links hover: `text-brand-green` or `hover:text-brand-green`

#### Light Theme (Modals)
Modals use a light theme for contrast against the dark blurred backdrop:

**Backgrounds:**
- Modal background: `bg-white`

**Text:**
- Headings: `text-brand-black` (#000000)
- Labels: `text-gray-700`
- Body text: Standard dark grays for readability

**Borders:**
- Modal border: `border-brand-green` (2px for emphasis)

**Interactive Elements:**
- Close buttons: `text-brand-black` with `hover:text-brand-green`
- Hover states: `hover:bg-gray-100`

## Component Color Patterns

### Navigation & Sidebar
```tsx
<div className="bg-brand-black border-r border-brand-dark">
  <div className="text-brand-light">
    <span className="text-brand-green">Logo</span>
    Brand Name
  </div>
  <SidebarItem className="text-brand-light hover:bg-brand-dark" />
</div>
```

### Cards
```tsx
<div className="bg-brand-black border-brand-dark rounded-md border">
  <div className="text-brand-light">
    Content
  </div>
</div>
```

### Forms & Inputs
```tsx
<Input className="bg-brand-black border-brand-dark text-brand-light
                  focus:ring-brand-green focus:border-brand-green" />
```

### Buttons

**Primary Button:**
```tsx
<Button
  className="bg-brand-green text-brand-black
             hover:bg-green-600 shadow-md hover:shadow-lg"
/>
```

**Secondary Button:**
```tsx
<Button
  className="bg-brand-dark text-brand-light
             border border-brand-green
             hover:bg-brand-dark/80"
/>
```

### Modals
```tsx
{/* Backdrop */}
<div className="bg-brand-black/70 backdrop-blur-md" />

{/* Modal Content */}
<div className="bg-white border-2 border-brand-green rounded-2xl">
  <h2 className="text-brand-black">Title</h2>
  <label className="text-gray-700">Label</label>
  <button className="text-brand-black hover:text-brand-green hover:bg-gray-100">
    Action
  </button>
</div>
```

## Typography

### Font Weights
- **Bold (700)**: Page titles, section headings, card titles
- **Semibold (600)**: Form labels, button text
- **Normal (400)**: Body text, descriptions

### Text Sizes

**Headings:**
- Hero titles: `text-5xl sm:text-6xl lg:text-7xl`
- Section titles: `text-3xl sm:text-4xl`
- Modal titles: `text-2xl`
- Card titles: `text-md`

**Body Text:**
- Large: `text-xl`
- Default: `text-base` (16px)
- Small: `text-sm`

**Text Colors by Context:**
- On dark backgrounds: `text-brand-light`
- On light backgrounds: `text-brand-black` or `text-gray-700`
- Muted text on dark: `text-brand-light/70` or `text-brand-light/50`
- Accent text: `text-brand-green`

## Spacing & Layout

### Container Padding
- Page padding: `p-4` (16px)
- Card padding: `p-4` (16px)
- Modal padding: `p-8` (32px)
- Sidebar padding: `pl-6` (24px)

### Gaps & Spacing
- Form field spacing: `space-y-4` (16px)
- Button groups: `gap-3` (12px)
- Section spacing: `py-20` (80px on landing page)

### Border Radius
- Cards: `rounded-md` (6px)
- Modals: `rounded-2xl` (16px)
- Inputs: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px) or `rounded-md` (6px)
- Landing page sections: `rounded-3xl` (24px)

## Interactive States

### Hover Effects
```css
/* Sidebar items */
hover:bg-brand-dark

/* Buttons (primary) */
hover:bg-green-600 hover:shadow-lg

/* Buttons (secondary) */
hover:bg-brand-dark/80

/* Close buttons on white */
hover:text-brand-green hover:bg-gray-100

/* Links */
hover:text-brand-green
```

### Focus States
```css
/* Inputs */
focus:outline-none
focus:ring-2
focus:ring-brand-green
focus:border-brand-green
```

### Transitions
```css
/* Standard transition */
transition-all duration-200

/* Color transitions */
transition-colors
```

## Visual Effects

### Shadows
```css
/* Cards and modals */
shadow-2xl

/* Buttons on hover */
shadow-md hover:shadow-lg
```

### Backdrop Blur
```css
/* Modal backdrop */
backdrop-blur-md

/* Navigation bar */
backdrop-blur-sm
```

### Opacity
```css
/* Backdrop */
bg-brand-black/70 (70% opacity)

/* Secondary background */
bg-brand-dark/50 (50% opacity)

/* Muted text */
text-brand-light/70 (70% opacity)
text-brand-light/50 (50% opacity)
```

## Accessibility

### Color Contrast Ratios

**Dark Theme:**
- White text (#EEEEEE) on black background (#000000): ✓ AAA compliant
- Light text (#EEEEEE) on dark green (#253900): ✓ AA compliant
- Green text (#08CB00) on black background: ✓ AA compliant

**Light Theme (Modals):**
- Black text (#000000) on white background: ✓ AAA compliant
- Gray text (#6B7280) on white background: ✓ AA compliant

### Focus Indicators
All interactive elements must have visible focus states:
- Input fields: 2px green ring (`focus:ring-2 focus:ring-brand-green`)
- Buttons: Outline or color change on focus
- Links: Underline or color change

## Implementation Notes

### Tailwind Configuration
The brand colors are defined in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      brand: {
        green: "#08CB00",
        dark: "#253900",
        darker: "#1a2600",
        black: "#000000",
        light: "#EEEEEE",
      }
    }
  }
}
```

### Usage in Components
Always use Tailwind utility classes with brand colors:
- ✓ `bg-brand-black`
- ✓ `text-brand-light`
- ✓ `border-brand-green`
- ✗ `style={{ background: '#000000' }}`

### Consistency Rules
1. **Dark pages** (Dashboard, Signup, Signin): Use black background with light text
2. **Light modals**: Use white background with dark text
3. **Accent color**: Brand green for CTAs, focus states, and highlights
4. **Borders**: Use brand-dark for subtle separation, brand-green for emphasis
5. **Hover states**: Increase opacity or change to brand-green

## Design Philosophy

### Minimalism
- Clean layouts with ample whitespace
- Focus on content over decoration
- Minimal use of colors (green accent only)

### Contrast
- High contrast between text and backgrounds
- Clear visual hierarchy
- Distinct interactive elements

### Consistency
- Reusable component patterns
- Consistent spacing system
- Unified color application

### Dark-First Design
- Primary theme is dark mode
- Light theme used sparingly (modals only)
- Green accent provides energy and focus
- Black backgrounds reduce eye strain

## Future Considerations

### Potential Additions
- Success state: Could use brand-green
- Error state: Consider adding a red variant
- Warning state: Consider adding an amber variant
- Info state: Consider a blue variant

### Theme Variations
Currently single dark theme. Future could include:
- Light mode toggle
- High contrast mode
- Colorblind-friendly variants
