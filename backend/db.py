"""SQLite layer for Scam Gym. Raw sqlite3, no ORM."""

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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS members (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                age           INTEGER,
                relationship  TEXT,
                bank_name     TEXT,
                account_last4 TEXT,
                created_at    TEXT NOT NULL
            )
            """
        )
        session_columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(sessions)")
        }
        if "member_id" not in session_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN member_id TEXT")


def create_session(
    session_id: str, quiz: dict[str, Any], member_id: str | None = None
) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO sessions "
            "(id, quiz_json, transcript_json, score_json, created_at, member_id) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                session_id,
                json.dumps(quiz),
                None,
                None,
                datetime.now(timezone.utc).isoformat(),
                member_id,
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
        "member_id": row["member_id"],
        "quiz": _load(row["quiz_json"]),
        "transcript": _load(row["transcript_json"]),
        "score": _load(row["score_json"]),
    }


def create_member(
    member_id: str,
    name: str,
    age: int | None,
    relationship: str | None,
    bank_name: str | None,
    account_last4: str | None,
) -> dict[str, Any]:
    member = {
        "id": member_id,
        "name": name,
        "age": age,
        "relationship": relationship,
        "bank_name": bank_name,
        "account_last4": account_last4,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO members
            (id, name, age, relationship, bank_name, account_last4, created_at)
            VALUES (:id, :name, :age, :relationship, :bank_name, :account_last4,
                    :created_at)
            """,
            member,
        )
    return member


def member_exists(member_id: str) -> bool:
    with _conn() as conn:
        return conn.execute(
            "SELECT 1 FROM members WHERE id = ?", (member_id,)
        ).fetchone() is not None


def _drills_for_member(conn: sqlite3.Connection, member_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT id, created_at, transcript_json, score_json
        FROM sessions
        WHERE member_id = ? AND score_json IS NOT NULL
        ORDER BY created_at DESC
        """,
        (member_id,),
    ).fetchall()
    drills = []
    for row in rows:
        score = json.loads(row["score_json"])
        behaviors = score.get("behaviors", [])
        if not behaviors:
            continue
        transcript = json.loads(row["transcript_json"]) if row["transcript_json"] else {}
        drills.append(
            {
                "session_id": row["id"],
                "created_at": row["created_at"],
                "scenario": transcript.get("scenario"),
                "resistance_score": round(
                    sum(behavior["behavior_pct"] for behavior in behaviors)
                    / len(behaviors)
                ),
                "biggest_gap": score.get("biggest_gap"),
            }
        )
    return drills


def get_members() -> list[dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM members ORDER BY created_at DESC").fetchall()
        return [
            {**dict(row), "drills": _drills_for_member(conn, row["id"])}
            for row in rows
        ]


def get_member(member_id: str) -> dict[str, Any] | None:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if row is None:
            return None
        return {**dict(row), "drills": _drills_for_member(conn, member_id)}


def delete_member(member_id: str) -> bool:
    with _conn() as conn:
        exists = conn.execute("SELECT 1 FROM members WHERE id = ?", (member_id,)).fetchone()
        if exists is None:
            return False
        conn.execute("UPDATE sessions SET member_id = NULL WHERE member_id = ?", (member_id,))
        conn.execute("DELETE FROM members WHERE id = ?", (member_id,))
        return True

def save_quiz(session_id: str, quiz: dict[str, Any]) -> bool:
    """Attach quiz answers to an existing session. False if no such session."""
    with _conn() as conn:
        cur = conn.execute(
            "UPDATE sessions SET quiz_json = ? WHERE id = ?",
            (json.dumps(quiz), session_id),
        )
        return cur.rowcount > 0
