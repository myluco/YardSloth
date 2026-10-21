# Yard Sloth

> **Walk your yard once with your phone, confirm the plant list, and get a care calendar plus evening frost alerts. Everything runs locally on your own machine.**

---

## 1. Project Directory Architecture

The repository divides responsibilities into distinct subsystems:

```
.
├── agents/             # CrewAI Agent & MCP Tooling Subsystem
│   ├── agent/         # Census, Calendar, and Frost watch agents
│   ├── assets/        # Agent personas, prompt templates & roles
│   ├── mcp/           # MCP tools (live web browsing for weather, frost, care rules)
│   ├── memory/        # Ephemeral in-memory session state (zero disk storage)
│   ├── main.py        # CrewAI pipeline coordinator
│   └── README.md      # Agents architecture documentation
│
├── server/             # 100% Pure Python HTTP Backend
│   ├── api/           # REST endpoint handlers (routes.py)
│   ├── server/        # Multithreaded HTTP server engine & network config
│   ├── main.py        # Python server entry point (python3 server/main.py)
│   └── README.md      # Server architecture documentation
│
├── ui/                 # React + TypeScript Presentation Layer
│   ├── assets/        # Visual photography & sloth mascot imagery
│   ├── components/    # Top navigation, frost banner & architecture modal
│   ├── pages/         # Tonight, Yard Walk, Confirm Plants, Calendar, Setup
│   ├── shared/        # TypeScript interfaces & API client
│   └── README.md      # UI presentation documentation
│
└── README.md           # Master system documentation
```

---

## 2. Core Architectural Principles

### A. The Server is Done 100% in Python
All backend logic, routing, agent coordination, and tool execution run exclusively in Python 3.10+ within `server/` and `agents/`. The JavaScript layer (`ui/`) is strictly responsible for presentation in the browser.

### B. Zero Stored Data Files
Files such as `care_rules.json` and `frost_dates.json` **do not exist**. Storing static plant rules or climate tables is strictly prohibited. Instead, the agents dynamically invoke the **Model Context Protocol (MCP)** tool (`agents/mcp/web_browser_tool.py`) to browse online horticultural and meteorological records on the fly.

### C. Ephemeral In-Memory State
All session data (plants confirmed in the yard, pending candidates, calendar chores, and cached forecasts) is kept strictly in volatile memory (`agents/memory/agent_memory.py`). Nothing is written to local SQLite, JSON, or CSV databases on disk.

### D. Model Explains, Code Decides
Dates, frost thresholds, and calendar task spreading are deterministic Python calculations—never generative LLM guesses. The agents provide the botanical synthesis and clear plain-language rationale, while the Python code enforces invariant dates and freeze thresholds.

---

## 3. The Three Multi-Agent Crews

1. **Plant Census Agent** (`agents/agent/census_agent.py`):
   - **Input**: Photos captured during a yard walk with location tags (e.g., *"Front bed, left of steps"*).
   - **MCP Tool**: Dispatches `web_browse_plant_care` to dynamically query online botanical repositories for bloom wood age and frost thresholds.
   - **Human-in-the-Loop**: Returns candidate objects with confidence ratings for review, confirmation, or correction before saving to memory.

2. **Care Calendar Agent** (`agents/agent/calendar_agent.py`):
   - **Input**: Confirmed garden plants plus local USDA zone and frost boundary dates.
   - **Deterministic Scheduler**: Analyzes whether plants bloom on **Old Wood** (prune strictly post-bloom in mid-summer) or **New Wood** (heavy dormant pruning in late winter), spreading tasks evenly across weeks.
   - **Output**: Detailed tasks with "Why" and "How" guidance, plus a downloadable RFC 5545 `.ics` calendar file.

3. **Frost Watch Agent** (`agents/agent/frost_agent.py`):
   - **Input**: Real-time meteorological stream fetched via MCP from Open-Meteo.
   - **Deterministic Hazard Engine**: Checks temperatures against critical biological thresholds:
     - $\le 36^\circ\text{F}$: Tender Watch (alerts for tomatoes, peppers, potted citrus).
     - $\le 32^\circ\text{F}$: Frost Alert (protects old-wood hydrangeas, dahlias, tender perennials).
     - $\le 28^\circ\text{F}$: Hard Freeze Alert (requires heavy root blankets and indoor sheltering).
   - **Output**: Actionable evening alert banner and step-by-step checklist.

---

## 4. Running the Project

### Start the Python Backend
```bash
python3 server/main.py
```

### Start the React UI
```bash
npm run dev
```
Navigate to `http://localhost:3000` to walk your yard, inspect candidates, view your care calendar, and test evening frost alerts!
