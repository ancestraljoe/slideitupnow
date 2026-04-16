---
description: Start the dev server and open the app in the browser
allowed-tools: Bash
---

Start the development server for the slideshow app.

1. Check if port 8080 is already in use: `lsof -i:8080`
2. If in use, kill the existing process
3. Start the server: `cd goonitupnow.github.io-main && python3 server.py &`
4. Wait 1 second, then verify it's running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/`
5. Report the URL: `http://localhost:8080`
