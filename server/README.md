# Yard Sloth: Python Server Subsystem

The `server/` subsystem houses the 100% pure Python backend for **Yard Sloth**.

## Directory Layout

```
server/
├── api/             # API route handlers
│   ├── routes.py    # Route logic interfacing with agents
│   └── __init__.py
├── server/          # Server engine
│   ├── http_server.py # Multithreaded Python HTTP server
│   ├── config.py      # Host, port, and network configuration
│   └── __init__.py
├── main.py          # Server launcher (python3 server/main.py)
└── README.md        # Documentation
```

## Features

- **100% Python Engine**: All server logic is executed in Python.
- **Agent Integration**: Invokes agents in `agents/` (Plant Census Agent, Care Calendar Agent, Frost Watch Agent).
- **Ephemeral State**: Relies entirely on `agents/memory/agent_memory.py` without storing any static files (`care_rules.json` and `frost_dates.json` are prohibited).
- **Live MCP Tooling**: Real-time web browsing via Model Context Protocol for weather, frost boundaries, and botanical care rules.
- **REST Endpoints**:
  - `GET /api/settings`, `POST /api/settings`
  - `GET /api/plants`, `POST /api/plants/confirm`, `DELETE /api/plants/:id`
  - `POST /api/census/identify`
  - `GET /api/calendar/tasks`, `POST /api/calendar/generate`, `PUT /api/calendar/tasks/:id/toggle`
  - `GET /api/calendar/export-ics`
  - `GET /api/forecast`, `POST /api/forecast/toggle-simulation`
