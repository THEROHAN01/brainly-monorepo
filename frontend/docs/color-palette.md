# Color Palette - Brainly Dark Theme

## Brand Colors

### Primary Colors
```
Green (Accent):     #08CB00
Dark Green:         #253900
Black (Background): #000000
Light Gray (Text):  #EEEEEE
```

## Usage in Tailwind

### CSS Classes
- `bg-brand-green` - Bright green background (#08CB00)
- `bg-brand-dark` - Dark green background (#253900)
- `bg-brand-black` - Black background (#000000)
- `bg-brand-light` - Light gray background (#EEEEEE)

- `text-brand-green` - Bright green text
- `text-brand-dark` - Dark green text
- `text-brand-black` - Black text
- `text-brand-light` - Light gray text

- `border-brand-green` - Bright green border
- `border-brand-dark` - Dark green border
- `border-brand-black` - Black border
- `border-brand-light` - Light gray border

## Color Roles

### Backgrounds
- **Primary Background**: `bg-brand-black` (#000000) - Main app background
- **Card/Container**: `bg-brand-dark` (#253900) - Cards, containers, elevated surfaces
- **Hover States**: Slightly lighter version of brand-dark

### Text
- **Primary Text**: `text-brand-light` (#EEEEEE) - Main readable text on dark backgrounds
- **Secondary Text**: Dimmed version of light (opacity-70)
- **Accent Text**: `text-brand-green` (#08CB00) - Links, highlights

### Accents & Actions
- **Primary Actions**: `bg-brand-green` (#08CB00) - Buttons, CTAs
- **Hover on Green**: Slightly darker green
- **Active States**: Even darker green

### Borders
- **Default Border**: `border-brand-dark` (#253900)
- **Focus Border**: `border-brand-green` (#08CB00)
- **Dividers**: `border-brand-dark` with opacity

## Design System Application

### Buttons
**Primary Button**:
- Background: `bg-brand-green`
- Text: `text-brand-black`
- Hover: Darker green
- Shadow: Green glow (optional)

**Secondary Button**:
- Background: `bg-brand-dark`
- Text: `text-brand-light`
- Border: `border-brand-green`
- Hover: Lighter version of dark

### Inputs
- Background: `bg-brand-dark`
- Text: `text-brand-light`
- Border: `border-brand-dark`
- Focus Border: `border-brand-green`
- Placeholder: `text-brand-light/50`

### Cards
- Background: `bg-brand-dark`
- Border: `border-brand-dark` or none
- Shadow: Subtle black shadow

### Links
- Default: `text-brand-green`
- Hover: Brighter green
- Visited: Same as default

## Accessibility Notes

### Contrast Ratios
- **#EEEEEE on #000000**: 18.23:1 (AAA - Excellent)
- **#08CB00 on #000000**: 8.91:1 (AAA)
- **#EEEEEE on #253900**: 12.74:1 (AAA)
- **#08CB00 on #253900**: 6.22:1 (AA)

All combinations meet WCAG AA standards, most meet AAA.

### Recommended Pairings
✅ Light text (#EEEEEE) on Black (#000000)
✅ Light text (#EEEEEE) on Dark (#253900)
✅ Green (#08CB00) on Black (#000000)
✅ Green (#08CB00) on Dark (#253900)
✅ Black text (#000000) on Green (#08CB00) - for buttons
⚠️ Avoid: Dark on Dark, Light on Green

## Example Signup Page Design (Dark Theme)

```
Background: bg-brand-black
Card: bg-brand-dark with subtle shadow
Heading: text-brand-light
Labels: text-brand-light/80
Inputs: bg-brand-black border-brand-dark focus:border-brand-green text-brand-light
Button: bg-brand-green text-brand-black hover:bg-green-600
Links: text-brand-green hover:underline
```
