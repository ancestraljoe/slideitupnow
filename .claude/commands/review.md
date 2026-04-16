---
description: Review recent changes for bugs, performance, and browser compatibility
allowed-tools: Bash, Read, Grep, Glob
---

Review the current diff for quality issues.

## Steps

1. **Get the diff**: `git diff` for unstaged, `git diff --cached` for staged, or `git diff HEAD~1` for last commit

2. **Invoke the js-reviewer agent** to analyze all changed .js files

3. **Check CSS changes** for:
   - Specificity conflicts
   - Missing vendor prefixes for used properties
   - Orphaned selectors (classes in CSS not used in HTML/JS)

4. **Check HTML changes** for:
   - Accessibility (alt tags, aria labels)
   - Semantic structure (proper heading hierarchy)
   - Missing meta tags

5. **Summary**: Provide a pass/fail verdict with specific issues to fix before shipping
