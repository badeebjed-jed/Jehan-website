import http.server, socketserver, os
DIR = os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIR, **k)
    def end_headers(self):
        # Prevent the browser from serving stale cached files in local preview
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()
    def log_message(self, *a):
        pass
with socketserver.TCPServer(("", 8080), H) as httpd:
    print("Serving", DIR, "at http://localhost:8080")
    httpd.serve_forever()
