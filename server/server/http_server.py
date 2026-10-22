"""
server/server/http_server.py

Python multithreaded HTTP server.
Routes incoming HTTP requests to server/api/routes.py.
Provides full REST JSON endpoints with CORS support.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import json
import urllib.parse
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from api import routes
except ImportError:
    from server.api import routes

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class YardSlothHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Default BaseHTTPRequestHandler writes access logs to stderr; use stdout instead.
        sys.stdout.write(
            "%s - - [%s] %s\n"
            % (self.address_string(), self.log_date_time_string(), format % args)
        )
        sys.stdout.flush()

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw_body)
        except Exception as e:
            print("Error parsing JSON body:", e)
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/settings":
            status, data = routes.handle_get_settings()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/plants":
            status, data = routes.handle_get_plants()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/calendar/tasks":
            status, data = routes.handle_get_tasks()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/calendar/export-ics":
            status, content, ctype = routes.handle_export_ics()
            self._set_headers(status, ctype)
            self.wfile.write(content.encode("utf-8"))

        elif path == "/api/forecast":
            status, data = routes.handle_get_forecast()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/ollama/status":
            status, data = routes.handle_get_ollama_status()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "healthy", "engine": "python3"}).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_json_body()

        if path == "/api/settings":
            status, data = routes.handle_post_settings(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/location/lookup":
            status, data = routes.handle_lookup_location(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/plants/confirm":
            status, data = routes.handle_post_confirm_plant(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/plants/update":
            status, data = routes.handle_post_update_plant(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/plants/update-location":
            status, data = routes.handle_update_yard_locations(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/yard-locations":
            status, data = routes.handle_update_yard_locations(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/census/identify":
            status, data = routes.handle_identify_plant(body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/calendar/generate":
            status, data = routes.handle_generate_tasks()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/tonight/evening-checklist":
            status, data = routes.handle_post_evening_checklist()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/forecast/toggle-simulation":
            status, data = routes.handle_toggle_simulation()
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/calendar/tasks/") and path.endswith("/toggle"):
            # Extract task id: /api/calendar/tasks/<id>/toggle
            parts = path.split("/")
            task_id = parts[4]
            status, data = routes.handle_toggle_task(task_id)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))
        elif path.startswith("/api/plants/") and not path.endswith("/toggle"):
            plant_id = path.replace("/api/plants/", "", 1)
            body = self._read_json_body()
            status, data = routes.handle_update_plant(plant_id, body)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/plants/candidate/"):
            cand_id = path.replace("/api/plants/candidate/", "")
            status, data = routes.handle_delete_candidate(cand_id)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path.startswith("/api/plants/"):
            plant_id = path.replace("/api/plants/", "")
            status, data = routes.handle_delete_plant(plant_id)
            self._set_headers(status)
            self.wfile.write(json.dumps(data).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

def run_server(host="0.0.0.0", port=8000):
    server_address = (host, port)
    httpd = ThreadedHTTPServer(server_address, YardSlothHTTPHandler)
    print(f"Yard Sloth Python Server running on http://{host}:{port}")
    httpd.serve_forever()
