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
├── llm/              # Ollama + LangGraph judge workflows
│   ├── graphs/       # dual gather + judge (plant care, evening checklist)
│   └── ollama_client.py
├── main.py           # CrewAI coordinator & pipeline runner
└── README.md         # Architecture documentation
```

## LLM judge pattern (LangGraph)

Plant care and the evening checklist use **two gather models** in parallel, then a **judge model** merges their outputs:

| Role | Default model | Purpose |
|------|----------------|---------|
| `ollama_model_a` | `gemma4:31b-cloud` | Primary profile / checklist draft |
| `ollama_model_b` | `qwen2.5:14b` | Second opinion (different family) |
| `ollama_judge_model` | `llama3.1:8b` | Merge drafts; smaller model is enough for comparison |

Override via settings (`POST /api/settings`) or env (`OLLAMA_MODEL_B`, `OLLAMA_JUDGE_MODEL`). Install Python deps: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` (npm start prefers `.venv/bin/python3` when present).

Terminal tracing: each Ollama HTTP call logs to stderr as `[YardSloth LLM]` (disable with `YARD_SLOTH_LLM_LOG=0`). Full model bodies print between `response begin` / `response end` lines when `YARD_SLOTH_LLM_LOG_RESPONSES=1` (default on via `npm start`; set `0` to hide). Optional `YARD_SLOTH_LLM_LOG_RESPONSE_MAX=20000` truncates long JSON. Plant refresh: **web excerpts** (not Ollama), then **three** Ollama calls—`research_a` and `research_b` in parallel (each drafts JSON from excerpts), then **judge** merges.

Ollama concurrency: `gather_a` and `gather_b` hit the server at the same time (often **two different models**). Ollama queues or loads runners based on VRAM. Useful server env vars (set **before** `ollama serve`): `OLLAMA_MAX_LOADED_MODELS` (how many models can stay loaded), `OLLAMA_NUM_PARALLEL` (parallel requests **per model**; default is often 1–4), `OLLAMA_MAX_QUEUE` (queue depth before 503).

## Zero-Storage & MCP Web Browsing Principle

- **No Static Files**: Yard Sloth stores **no** static files like `care_rules.json` or `frost_dates.json`.
- **Live MCP Tool**: Whenever care rules or frost dates are needed, agents invoke `mcp/web_browser_tool.py` to query live web sources.
- **Model Explains, Code Decides**: Dates, schedules, and temperature thresholds are deterministic Python calculations, not generative guesses.
