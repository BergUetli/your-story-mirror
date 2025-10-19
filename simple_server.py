#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import urlparse

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Serve static assets normally
        if path.startswith('/assets/') or path.endswith(('.js', '.css', '.png', '.jpg', '.ico', '.svg')):
            return super().do_GET()
        
        # For all other routes, serve index.html (SPA behavior)
        if path != '/' and not os.path.exists('.' + path):
            self.path = '/'
        
        return super().do_GET()

if __name__ == "__main__":
    PORT = 7777
    Handler = SPAHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving SPA on http://0.0.0.0:{PORT}")
        httpd.serve_forever()