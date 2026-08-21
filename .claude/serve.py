"""Static file server for local development.

Identical to `python -m http.server` except that it tells the browser never
to cache anything. Without this, edits to css/style.css and js/main.js can
sit invisible behind a cached copy while you wonder why nothing changed.

Run it through the preview tooling (.claude/launch.json points at this
file), or directly:

    python .claude/serve.py 8765
"""

import sys
from http.server import SimpleHTTPRequestHandler, test


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        SimpleHTTPRequestHandler.end_headers(self)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    test(HandlerClass=NoCacheHandler, port=port, bind="127.0.0.1")
