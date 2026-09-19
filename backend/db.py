"""SQLite layer for Scam Gym. Raw sqlite3, one table, no ORM."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scamgym.db")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id              TEXT PRIMARY KEY,
                quiz_json       TEXT,
                transcript_json TEXT,
                score_json      TEXT,
                created_at      TEXT NOT NULL
            )
            """
        )


def create_session(session_id: str, quiz: dict[str, Any]) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO sessions (id, quiz_json, transcript_json, score_json, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                session_id,
                json.dumps(quiz),
                None,
                None,
                datetime.now(timezone.utc).isoformat(),
            ),
        )


def save_transcript(session_id: str, transcript: dict[str, Any]) -> bool:
    """Returns False if the session id does not exist."""
    with _conn() as conn:
        cur = conn.execute(
            "UPDATE sessions SET transcript_json = ? WHERE id = ?",
            (json.dumps(transcript), session_id),
        )
        return cur.rowcount > 0


def save_score(session_id: str, score: dict[str, Any]) -> bool:
    with _conn() as conn:
        cur = conn.execute(
            "UPDATE sessions SET score_json = ? WHERE id = ?",
            (json.dumps(score), session_id),
        )
        return cur.rowcount > 0


def get_session(session_id: str) -> dict[str, Any] | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()

    if row is None:
        return None

    def _load(value: str | None) -> Any:
        return json.loads(value) if value else None

    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "quiz": _load(row["quiz_json"]),
        "transcript": _load(row["transcript_json"]),
        "score": _load(row["score_json"]),
    }

def save_quiz(session_id: str, quiz: dict[str, Any]) -> bool:
    """Attach quiz answers to an existing session. False if no such session."""
    with _conn() as conn:
        cur = conn.execute(
            "UPDATE sessions SET quiz_json = ? WHERE id = ?",
            (json.dumps(quiz), session_id),
        )
        return cur.rowcount > 0
