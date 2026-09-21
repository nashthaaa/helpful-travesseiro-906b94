"""Tiny dev server: same as `python3 -m http.server`, but never caches,
so edits show up on a normal refresh."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
print(f'Serving on http://localhost:{port}')
ThreadingHTTPServer(('', port), NoCache).serve_forever()
