---
name: accessibility-check
description: Audit the HTML for accessibility issues (WCAG compliance, ARIA labels, keyboard navigation). Use when the user mentions accessibility, a11y, WCAG, or screen readers.
allowed-tools: Read, Grep, Glob
---

# Accessibility Audit

Check `index.html` and related files for WCAG 2.1 Level AA compliance.

## Checks

### 1. Images
- Every `<img>` must have an `alt` attribute
- Decorative images should use `alt=""`
- Icons used as buttons need `aria-label`

### 2. Interactive Elements
- All `<a href="#">` should have meaningful text or `aria-label`
- Buttons must be focusable and have descriptive text
- Custom controls (volume slider SVG) need `role` and `aria-*` attributes

### 3. Keyboard Navigation
- Check for `tabindex` on custom interactive elements
- Verify `keydown`/`keyup` handlers exist for keyboard shortcuts
- Modal/settings panel should trap focus

### 4. Color & Contrast
- Text must have 4.5:1 contrast ratio against background
- Check CSS for low-contrast color combinations

### 5. Semantic HTML
- Proper heading hierarchy (`h1` > `h2` > `h3`)
- Use of landmark roles (`nav`, `main`, `aside`)
- Form labels associated with inputs

## Output

List issues by severity:
```
[CRITICAL] img at line 28 missing alt attribute
[WARNING] Volume slider SVG has no ARIA role
[INFO] Consider adding skip-to-content link
```
