#!/bin/sh
PORT=${PORT:-8080}
echo "=== TEST SERVER on port $PORT ==="
exec python3 -c "
import http.server, socketserver, os, sys
PORT = int(os.environ.get('PORT', 8080))
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'RAILWAY ROUTING OK')
        sys.stdout.flush()
    def log_message(self, fmt, *a):
        sys.stdout.write(fmt % a + '\n'); sys.stdout.flush()
httpd = socketserver.TCPServer(('0.0.0.0', PORT), H)
print(f'Test server listening on 0.0.0.0:{PORT}', flush=True)
httpd.serve_forever()
"
