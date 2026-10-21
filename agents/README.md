# Yard Sloth: Agents Subsystem

The `agents/` subsystem encapsulates the multi-agent intelligence layer for **Yard Sloth** using the CrewAI mental model and the Model Context Protocol (MCP).

## Directory Structure

```
agents/
├── agent/            # CrewAI agent implementations
│   ├── census_agent.py    # Plant Census Agent (botanical morphology & wood type)
│   ├── calendar_agent.py  # Care Calendar Agent (pruning & task spreading)
│   └── frost_agent.py     # Frost Watch Agent (Open-Meteo & freeze alerts)
├── mcp/              # MCP tool implementations
│   ├── web_browser_tool.py # Live web browsing (weather, frost dates, care rules)
│   └── mcp_client.py       # MCP dispatcher protocol
├── memory/           # Ephemeral memory (zero disk files)
│   └── agent_memory.py     # Session state for plants, candidates, and tasks
├── assets/           # Agent prompts and roles
│   └── prompts.py          # Backstories and goal definitions
├── main.py           # CrewAI coordinator & pipeline runner
└── README.md         # Architecture documentation
```

## Zero-Storage & MCP Web Browsing Principle

- **No Static Files**: Yard Sloth stores **no** static files like `care_rules.json` or `frost_dates.json`.
- **Live MCP Tool**: Whenever care rules or frost dates are needed, agents invoke `mcp/web_browser_tool.py` to query live web sources.
- **Model Explains, Code Decides**: Dates, schedules, and temperature thresholds are deterministic Python calculations, not generative guesses.
