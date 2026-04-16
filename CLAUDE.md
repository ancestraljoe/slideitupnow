# CLAUDE.md

## Project Overview

**SlideItUpNow** — A client-side slideshow utility that runs entirely in the browser. Loads images/videos recursively from local directories, supports split layouts, volume control, and custom backgrounds.

**Stack:** Vanilla HTML5, CSS3, JavaScript (ES modules), no build system, no framework
**Hosting:** GitHub Pages (static)
**Dev server:** Python `http.server` on port 8080

## Commands

```bash
python3 server.py              # Dev server (localhost:8080)
python3 -m http.server 8080    # Alternative dev server
```

No build step, no package manager, no linting configured.

## Architecture

```
goonitupnow.github.io-main/
├── index.html          # Entry point, menu UI, slide containers
├── script.js           # Core slideshow logic (ES module)
├── settings.js         # Settings panel logic
├── localFiles.js       # Local file/directory loading
├── reddit.js           # Reddit content integration
├── reddit_presets.js   # Predefined Reddit sources
├── utils.js            # Shared utility functions
├── style.css           # Main styles
├── tooltip.css         # Tooltip component styles
├── tooltip.js          # Tooltip behavior
├── server.py           # No-cache dev server
└── resources/          # Static assets (arrows, icons)
```

## Key Patterns

- **ES Modules:** `script.js` uses `type="module"`, others loaded via `<script>` tags
- **No framework:** DOM manipulation via `document.getElementById`, `querySelector`
- **HLS.js:** External CDN dependency for video streaming
- **File API:** `showDirectoryPicker()` for local file access
- **No state management:** State lives in module-scoped variables
- **CSS:** No preprocessor, no utility framework, vanilla CSS with flexbox/grid

## File Conventions

- All source files at project root (flat structure)
- `camelCase` for JS variables and functions
- CSS classes use `kebab-case` and `camelCase` mix
- No TypeScript, no JSDoc annotations

## Deployment

Push to `main` branch on GitHub — GitHub Pages auto-deploys. No CI/CD pipeline.

## Testing

No automated tests. Manual QA:
1. Start dev server: `python3 server.py`
2. Open `http://localhost:8080`
3. Load a local directory
4. Verify slideshow plays, settings work, splits render
5. Test video playback with volume control

## Security Notes

- Runs entirely client-side, no server API
- No user data stored or transmitted
- Only external network call: HLS.js CDN + Reddit API (optional)
