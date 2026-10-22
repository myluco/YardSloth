"""
server/main.py

Main launcher for the Yard Sloth Python backend.
Starts the HTTP server and initializes the CrewAI pipeline with ephemeral memory.
"""

import sys
import os

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
server_dir = os.path.abspath(os.path.dirname(__file__))

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

try:
    from server.server.config import HOST, PORT
    from server.server.http_server import run_server
except ImportError:
    from server.config import HOST, PORT
    from server.http_server import run_server

if __name__ == "__main__":
    # Start HTTP immediately; calendar/tasks are generated on demand via API
    # (avoids blocking startup on multiple Ollama calls while the UI loads).
    print("Starting Python HTTP Server...")
    run_server(host=HOST, port=PORT)
