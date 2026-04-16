---
description: Create a feature branch, commit changes, push, and open a PR against main
argument-hint: [short-description]
allowed-tools: Bash, Read, Grep
---

Ship workflow via PR. Never push directly to main.

## Steps

1. **Pre-flight check**: Verify no syntax errors in JS files
   ```bash
   for f in goonitupnow.github.io-main/*.js; do node --check "$f" 2>&1; done
   ```

2. **Branch**: If on `main`, create a feature branch from $ARGUMENTS or the diff summary
   ```bash
   # Generate branch name from argument or diff
   BRANCH_NAME="feat/$(echo "$ARGUMENTS" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | head -c 50)"
   git checkout -b "$BRANCH_NAME"
   ```
   If already on a feature branch, stay on it.

3. **Stage & Commit**: Stage relevant files and commit
   ```bash
   git add -A
   git diff --cached --stat
   ```
   Analyze the diff and create a concise commit message. If $ARGUMENTS is provided, use it as the base.
   Always end the commit message with `Co-Authored-By: Claude <noreply@anthropic.com>`

4. **Push**: Push the feature branch
   ```bash
   git push -u origin HEAD
   ```

5. **Create PR**: Open a pull request against main
   ```bash
   gh pr create --title "..." --body "$(cat <<'EOF'
   ## Summary
   ...

   ## Test plan
   - [ ] Dev server starts
   - [ ] Page loads correctly
   - [ ] No JS console errors

   Generated with [Claude Code](https://claude.ai/claude-code)
   EOF
   )"
   ```

6. **Report**: Print the PR URL. Remind that merging to main triggers GitHub Pages deploy.

## Rules
- NEVER push directly to main
- NEVER use `--force` without explicit user confirmation
- One PR per logical change
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes
