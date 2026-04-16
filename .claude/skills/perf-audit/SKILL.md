---
name: perf-audit
description: Audit JavaScript and CSS for performance issues (memory leaks, layout thrashing, unoptimized animations). Use when the user mentions performance, speed, lag, or optimization.
allowed-tools: Read, Grep, Glob
---

# Performance Audit

Analyze the slideshow app for performance bottlenecks.

## JavaScript Checks

### 1. Event Listener Leaks
- Search for `addEventListener` without matching `removeEventListener`
- Check for listeners added in loops without cleanup
- Verify `setInterval`/`setTimeout` are cleared when no longer needed

### 2. DOM Manipulation
- Look for reads followed by writes (layout thrashing)
- Check for `innerHTML` usage in loops (should batch)
- Verify `requestAnimationFrame` is used for animations

### 3. Memory
- Large arrays or objects that grow unbounded
- Blob URLs created but never revoked (`URL.revokeObjectURL`)
- Video/audio elements created but never removed from DOM

### 4. Network
- Check for HLS.js instances not destroyed
- Reddit API calls without debounce/throttle
- Missing error handling on fetch/XHR

## CSS Checks

### 5. Rendering
- Check for expensive CSS properties in animations (`box-shadow`, `filter`, `backdrop-filter`)
- Verify `will-change` or `transform: translateZ(0)` on animated elements
- Check for `*` selectors or deep nesting

## Output

```
[CRITICAL] script.js:142 — setInterval never cleared, will leak memory
[WARNING] style.css:89 — box-shadow transition causes paint on every frame
[INFO] Consider lazy-loading images outside viewport
```
