"""
server/server/config.py

Python server configuration parameters.
"""

import os

HOST = os.environ.get("PYTHON_HOST", "0.0.0.0")
PORT = int(os.environ.get("PYTHON_PORT", "8765"))
DEBUG = os.environ.get("PYTHON_DEBUG", "True").lower() == "true"
