import http.server, socketserver, os
os.chdir(os.path.dirname(__file__))
with socketserver.TCPServer(("", 8080), http.server.SimpleHTTPRequestHandler) as httpd:
    print("Serving at http://localhost:8080")
    httpd.serve_forever()
