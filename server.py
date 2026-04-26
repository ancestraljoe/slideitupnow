#!/usr/bin/env python3
import http.server
import urllib.request
import urllib.error

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Proxy Reddit API requests to avoid CORS
        if self.path.startswith('/reddit/'):
            reddit_path = self.path[7:]  # strip '/reddit'
            reddit_url = 'https://api.reddit.com' + reddit_path
            try:
                req = urllib.request.Request(reddit_url, headers={
                    'User-Agent': 'SlideItUpNow/1.0'
                })
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(str(e).encode())
            return

        # Serve static files normally
        super().do_GET()

if __name__ == '__main__':
    http.server.test(HandlerClass=ProxyHandler, port=8080)
