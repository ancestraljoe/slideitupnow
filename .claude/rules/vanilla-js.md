# Vanilla JS Project Rules

This is a vanilla JavaScript project. Do NOT:

- Add npm/pnpm/yarn dependencies
- Introduce TypeScript
- Add a build system (webpack, vite, rollup)
- Add a CSS preprocessor (sass, less)
- Add a UI framework (React, Vue, Svelte)
- Convert to a Node.js project
- Add package.json unless explicitly asked

DO:
- Use modern vanilla JS (ES2020+): optional chaining, nullish coalescing, async/await
- Keep all source files at the project root (flat structure)
- Use ES modules (`import`/`export`) in script.js, standard scripts elsewhere
- Test changes by running `python3 server.py` and checking in browser
- Preserve backward compatibility with existing functionality
