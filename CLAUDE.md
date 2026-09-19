# Project: voice-based scam pressure simulator

## Stack (do not add to this without asking)
- Backend: Python 3.11, FastAPI, SQLite (raw sqlite3, no ORM), Pydantic v2
- Frontend: Vite + React + Tailwind + Recharts
- Voice: @elevenlabs/react in the browser
- LLM: NVIDIA Nemotron via the openai python package pointed at NVIDIA's base_url

## Rules
- Never add a dependency without asking.
- Never rewrite working code that wasn't part of the request.
- Keep functions short. No abstractions until there are 3 uses.
- All request/response bodies are Pydantic models.

## Current state
- Voice works: @elevenlabs/react with ConversationProvider (agentId on the provider, NOT in startSession)
- startSession takes only dynamicVariables — no agentId, no connectionType
- Agent ID lives in frontend/.env as VITE_ELEVENLABS_AGENT_ID
- Transcript shape is frozen in contracts/transcript.json