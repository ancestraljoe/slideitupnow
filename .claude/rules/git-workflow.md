# Git Workflow Rules

## Branch Strategy
- **main** is protected — never push directly, always use PRs
- Create feature branches: `feat/`, `fix/`, `chore/`, `docs/` prefixes
- One logical change per branch and PR
- Delete branches after merging

## Commits
- Create **separate commits per file** when possible
- Write concise commit messages focusing on "why" not "what"
- Always verify JS syntax (`node --check`) before committing
- End commit messages with `Co-Authored-By: Claude <noreply@anthropic.com>`

## Pull Requests
- Use `/ship` command to create branches and PRs
- PR title: short (under 70 chars), use description for details
- Always include a test plan in the PR body
- Merging to main triggers GitHub Pages auto-deploy

## Safety
- Never force-push without explicit user confirmation
- Never use `--no-verify` or skip hooks
- Never push secrets, .env files, or settings.local.json
