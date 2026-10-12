"""Minimal static file server with SPA fallback: any request for a path that isn't a
real file on disk gets index.html instead of a 404, so client-side routes (/chat, /photo,
/chat/:id, /photo/:id) work on a direct page load or refresh, not just via in-app navigation.
Usage: python3 serve-spa.py <port> <directory>
"""

import http.server
import os
import sys


class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        clean_path = self.path.split("?", 1)[0]
        requested = self.translate_path(clean_path)
        # Only fall back for extension-less paths (client-side routes like /chat/<id>).
        # A path that looks like a real asset request (has a dot, e.g. missing-file.js)
        # still 404s normally instead of silently returning an HTML page for it.
        looks_like_file = "." in clean_path.rsplit("/", 1)[-1]
        if not os.path.isfile(requested) and not looks_like_file:
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    os.chdir(directory)
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), SPARequestHandler)
    server.serve_forever()
