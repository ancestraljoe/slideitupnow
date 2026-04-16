---
name: js-lint
description: Run JavaScript syntax and quality checks on all .js files in the project. Use when the user asks to lint, check syntax, or validate JavaScript.
allowed-tools: Bash, Read, Grep, Glob
---

# JavaScript Lint Check

Run syntax and quality checks on all JavaScript files in the project.

## Steps

### 1. Syntax Check
Parse-check every .js file using Node.js:
```bash
for f in goonitupnow.github.io-main/*.js; do
  echo "Checking $(basename $f)..."
  node --check "$f" 2>&1
done
```

### 2. Common Issues Scan
Search for common problems using grep:

```bash
# Undefined variable patterns (console.log with typos)
grep -n "consol\." goonitupnow.github.io-main/*.js || true

# Accidental assignment in conditions
grep -n "if.*[^!=<>]=[^=]" goonitupnow.github.io-main/*.js || true

# Debugger statements left in
grep -n "debugger" goonitupnow.github.io-main/*.js || true

# alert() calls left in
grep -n "alert(" goonitupnow.github.io-main/*.js || true
```

### 3. Report
Output a summary:
```
[PASS/FAIL] Syntax: X files checked, Y errors
[PASS/FAIL] Quality: X issues found
```
