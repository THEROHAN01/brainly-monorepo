# Troubleshooting

## Modal Background Color Issue

If the CreateContentModal appears white instead of dark:

### Current Setup:
- Modal background: `#253900` (very dark green, almost black)
- This color should appear as a dark green/black background
- Border: `#08CB00` (bright green) - should be clearly visible

### Possible Solutions:

1. **Restart Vite Dev Server**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   npm run dev
   ```
   Tailwind needs to rebuild when `tailwind.config.js` changes.

2. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or open DevTools and right-click refresh button → "Empty Cache and Hard Reload"

3. **Check Tailwind Build**
   - Verify `tailwind.config.js` has the brand colors
   - Check browser DevTools → Inspect modal → See computed background-color
   - Should be: `rgb(37, 57, 0)` which is `#253900`

4. **Verify Color Rendering**
   Open browser console and paste:
   ```javascript
   const modal = document.querySelector('[class*="bg-\\[\\#253900\\]"]');
   console.log(window.getComputedStyle(modal).backgroundColor);
   // Should output: rgb(37, 57, 0)
   ```

### Expected Appearance:
- **Backdrop**: Semi-transparent black with blur
- **Modal**: Very dark green (almost black) background
- **Border**: Bright green (#08CB00) - highly visible
- **Text**: Light gray (#EEEEEE)
- **Inputs**: Pure black (#000000) background

### Color Reference:
```
#253900 = rgb(37, 57, 0)
- Red: 37 (very low)
- Green: 57 (low but higher than red)
- Blue: 0 (none)
Result: Very dark olive/green, appears almost black
```

If the modal still appears white, there may be a CSS conflict. Check:
1. Browser DevTools → Elements tab → Inspect modal div
2. Look at Styles panel for any overriding CSS
3. Check for `opacity` or `background-color` being overridden
