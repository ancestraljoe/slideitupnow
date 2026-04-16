---
description: Run all verification checks on the app (syntax, server, file integrity)
allowed-tools: Bash, Read, Grep, Glob
---

Run comprehensive verification on the slideshow app.

## Checks

1. **JavaScript Syntax**: Parse-check every .js file
   ```bash
   for f in goonitupnow.github.io-main/*.js; do echo "Checking $f..."; node --check "$f" 2>&1; done
   ```

2. **HTML Validity**: Check for unclosed tags and broken references in index.html

3. **File References**: Verify every src, href, and import in HTML/JS actually exists on disk

4. **CSS Sanity**: Check that CSS selectors referenced in JS actually exist in style.css

5. **Server Test**: Start server, verify all assets load with 200 status, stop server

## Output

Report as a checklist:
```
[PASS] All JS files parse without errors
[PASS] All HTML references resolve
[FAIL] settings.js references .slider-control but not found in style.css
```

Use the `verify-app` agent for the server portion of the checks.
