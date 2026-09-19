"""Scam Gym API — CP1 skeleton.

Run from backend/:   python3 -m uvicorn main:app --reload
Interactive docs:    http://localhost:8000/docs

Pydantic models below mirror contracts/transcript.json and contracts/score.json.
Those files are the source of truth. If one changes, change it here in the
same commit.
"""

import uuid
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db

db.init_db()

app = FastAPI(title="Scam Gym API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# contracts/transcript.json
# --------------------------------------------------------------------------


class Turn(BaseModel):
    speaker: Literal["agent", "user"]
    text: str
    ts: float  # seconds since call start


class Transcript(BaseModel):
    session_id: str
    scenario: str  # e.g. "bank_fraud" — matches a file in scenarios/
    turns: list[Turn]
    duration_sec: float


# --------------------------------------------------------------------------
# contracts/score.json
# --------------------------------------------------------------------------


class Evidence(BaseModel):
    quote: str
    ts: float
    # CP2: pin the allowed values in rubric.json (complied / resisted / partial)
    # and tighten this to a Literal once they're decided.
    verdict: str


class Behavior(BaseModel):
    name: str  # snake_case key, must match rubric.json
    label: str  # human-readable; filled from rubric.json, NOT generated
    knowledge_pct: int = Field(ge=0, le=100)
    behavior_pct: int = Field(ge=0, le=100)
    evidence: list[Evidence]


class TimelineEvent(BaseModel):
    ts: float
    tactic: str  # must match a tactic name in scenarios/bank_fraud.json
    user_response: str
    good: bool


class Score(BaseModel):
    session_id: str
    behaviors: list[Behavior]
    timeline: list[TimelineEvent]
    biggest_gap: str
    summary_line: str


# --------------------------------------------------------------------------
# Request / response wrappers
# --------------------------------------------------------------------------


class CreateSessionRequest(BaseModel):
    # Quiz shape stays loose at CP1 — it isn't the integration risk, and
    # locking it now would block the quiz screen at CP3.
    quiz: dict[str, Any] = Field(default_factory=dict)


class CreateSessionResponse(BaseModel):
    session_id: str


class TranscriptResponse(BaseModel):
    ok: bool
    turns_stored: int


class SessionResponse(BaseModel):
    id: str
    created_at: str
    quiz: dict[str, Any] | None
    transcript: Transcript | None
    score: Score | None


# --------------------------------------------------------------------------
# CP3 replaces this with a real Nemotron call in scoring.py.
# Behavior names and tactic names here are placeholders — swap them for the
# real ones once rubric.json and bank_fraud.json exist.
# --------------------------------------------------------------------------


def stub_score(session_id: str) -> dict[str, Any]:
    return {
        "session_id": session_id,
        "behaviors": [
            {
                "name": "urgency_resistance",
                "label": "Urgency Resistance",
                "knowledge_pct": 95,
                "behavior_pct": 20,
                "evidence": [
                    {
                        "quote": "Okay okay, what do I need to do?",
                        "ts": 31.4,
                        "verdict": "complied",
                    }
                ],
            },
            {
                "name": "independent_verification",
                "label": "Independent Verification",
                "knowledge_pct": 90,
                "behavior_pct": 30,
                "evidence": [
                    {
                        "quote": "No, I can just do it now, go ahead.",
                        "ts": 58.2,
                        "verdict": "complied",
                    }
                ],
            },
            {
                "name": "information_withholding",
                "label": "Information Withholding",
                "knowledge_pct": 100,
                "behavior_pct": 35,
                "evidence": [
                    {"quote": "Sure, it's 4417.", "ts": 108.0, "verdict": "complied"}
                ],
            },
            {
                "name": "authority_deference",
                "label": "Authority Deference",
                "knowledge_pct": 85,
                "behavior_pct": 10,
                "evidence": [
                    {"quote": "I'm still here, sorry.", "ts": 96.0, "verdict": "complied"}
                ],
            },
        ],
        "timeline": [
            {"ts": 42.0, "tactic": "urgency", "user_response": "kept talking", "good": False},
            {"ts": 71.5, "tactic": "authority", "user_response": "accepted claim", "good": False},
            {"ts": 108.0, "tactic": "identity_confirmation", "user_response": "gave last four", "good": False},
        ],
        "biggest_gap": "independent_verification",
        "summary_line": "You said you'd verify. You didn't.",
    }


@app.get("/health")
def health() -> dict[str, bool]:
    """Not a feature endpoint. Here so the frontend can prove CORS works."""
    return {"ok": True}


class QuizPatch(BaseModel):
    quiz: dict[str, Any]


@app.post("/session", response_model=CreateSessionResponse)
def create_session(
    body: CreateSessionRequest | None = None,
) -> CreateSessionResponse:
    """Quiz is optional here — answers arrive after the call, via PATCH."""
    session_id = uuid.uuid4().hex[:12]
    db.create_session(session_id, body.quiz if body else {})
    return CreateSessionResponse(session_id=session_id)


@app.patch("/session/{session_id}")
def patch_session(session_id: str, body: QuizPatch) -> dict[str, bool]:
    """Attach the post-call confidence answers."""
    if not db.save_quiz(session_id, body.quiz):
        raise HTTPException(404, f"no session with id {session_id!r}")
    return {"ok": True}


@app.post("/transcript", response_model=TranscriptResponse)
def post_transcript(body: Transcript) -> TranscriptResponse:
    """Body is the transcript object exactly as in contracts/transcript.json.
    session_id is inside it, so there is no wrapper."""
    stored = db.save_transcript(body.session_id, body.model_dump())
    if not stored:
        raise HTTPException(404, f"no session with id {body.session_id!r}")
    return TranscriptResponse(ok=True, turns_stored=len(body.turns))


@app.post("/score/{session_id}", response_model=Score)
def score_session(session_id: str) -> Score:
    row = db.get_session(session_id)
    if row is None:
        raise HTTPException(404, f"no session with id {session_id!r}")
    if row["transcript"] is None:
        raise HTTPException(409, "no transcript on this session yet")

    # CP3: score = scoring.run(row["transcript"], rubric)
    score = stub_score(session_id)

    db.save_score(session_id, score)
    return Score(**score)


@app.get("/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: str) -> SessionResponse:
    row = db.get_session(session_id)
    if row is None:
        raise HTTPException(404, f"no session with id {session_id!r}")
    return SessionResponse(**row)