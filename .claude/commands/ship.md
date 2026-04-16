---
description: Commit all changes, push to main, and verify GitHub Pages deployment
argument-hint: [commit-message]
allowed-tools: Bash, Read, Grep
---

Ship workflow for the slideshow app. Uses the commit message provided as $ARGUMENTS, or auto-generates one.

## Steps

1. **Pre-flight check**: Verify no syntax errors in JS files
   ```bash
   for f in goonitupnow.github.io-main/*.js; do node --check "$f" 2>&1; done
   ```

2. **Stage changes**: Show `git status` and stage relevant files
   ```bash
   git add -A
   ```

3. **Commit**: Use provided message or generate from diff
   ```bash
   git commit -m "$ARGUMENTS"
   ```
   If no $ARGUMENTS provided, analyze the diff and create a concise commit message.

4. **Push**: Push to main
   ```bash
   git push origin main
   ```

5. **Report**: Confirm push succeeded and remind that GitHub Pages deploys automatically.
