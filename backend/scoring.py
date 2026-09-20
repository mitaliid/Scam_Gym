"""Nemotron scoring for Scam Gym.

Split of responsibilities, deliberately:
  Python decides   -> knowledge_pct (quiz arithmetic), label, biggest_gap
  Nemotron decides -> behavior_pct, evidence quotes, timeline, summary_line

Nemotron 3 Super is a reasoning model and will emit its chain of thought as
message content, crowding out the JSON. We disable template thinking for this
call and fall back gracefully if the endpoint rejects that flag.
"""

import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
SCENARIOS_DIR = BASE_DIR.parent / "scenarios"

BASE_URL = "https://integrate.api.nvidia.com/v1"
MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/nemotron-3-super-120b-a12b")

_client: OpenAI | None = None
_no_think_supported = True


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        key = os.getenv("NVIDIA_API_KEY")
        if not key:
            raise RuntimeError("NVIDIA_API_KEY is not set. Put it in backend/.env")
        _client = OpenAI(base_url=BASE_URL, api_key=key)
    return _client


def load_rubric() -> dict[str, Any]:
    return json.loads((SCENARIOS_DIR / "rubric.json").read_text())


def load_quiz() -> dict[str, Any]:
    return json.loads((SCENARIOS_DIR / "quiz.json").read_text())


# --------------------------------------------------------------------------
# Deterministic half
# --------------------------------------------------------------------------


def knowledge_by_behavior(quiz_answers: dict[str, str]) -> dict[str, int]:
    quiz = load_quiz()
    buckets: dict[str, list[int]] = {}

    for question in quiz["questions"]:
        chosen = quiz_answers.get(question["id"])
        if chosen is None:
            print(f"WARNING: no answer for {question['id']} — frontend sent {list(quiz_answers)}")
            continue
        match = next(
            (o for o in question["options"] if o["id"] == chosen), None
        )
        if match is None:
            print(f"WARNING: {question['id']} got unknown option {chosen!r}")
            continue
        buckets.setdefault(question["behavior"], []).append(int(match["score"]))

    return {
        behavior: round(sum(scores) / len(scores))
        for behavior, scores in buckets.items()
    }


# --------------------------------------------------------------------------
# Model half
# --------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a scoring engine. You reply with a single JSON object and "
    "nothing else. Do not reason out loud. Do not explain. Do not use "
    "markdown code fences. Your entire reply must start with { and end with }."
)


def _build_user_prompt(
    transcript: dict[str, Any],
    rubric: dict[str, Any],
    knowledge: dict[str, int] | None = None,
) -> str:
    behaviors_block = json.dumps(rubric["behaviors"], indent=2)
    rules_block = "\n".join(f"- {r}" for r in rubric["scoring_rules"])
    turns_block = "\n".join(
        f'[{turn["ts"]:.1f}s] {turn["speaker"].upper()}: {turn["text"]}'
        for turn in transcript["turns"]
    )
    tactics = ", ".join(rubric["tactics"])
    verdicts = ", ".join(rubric["verdicts"])
    names = [b["name"] for b in rubric["behaviors"]]

    confidence_block = (
        "\n".join(
            f"- {name}: user predicted they were {pct}% likely to do this"
            for name, pct in (knowledge or {}).items()
        )
        or "(not available)"
    )

    return f"""Score how the USER behaved during a simulated scam phone call.
A fake bank fraud investigator pressured them. Judge only the user.

SCORING RULES
{rules_block}

BEHAVIORS TO SCORE
{behaviors_block}

Scale: behavior_pct is 0-100. resisted = 100, partial = 50, complied = 0.
ALLOWED tactic values: {tactics}
ALLOWED verdict values: {verdicts}

WHAT THE USER PREDICTED ABOUT THEMSELVES BEFORE THE CALL
{confidence_block}

TRANSCRIPT
{turns_block}

Output this exact JSON shape, one entry in "behaviors" for each of
{names}, in that order. One timeline entry per tactic the agent used,
maximum 4 entries. ts is the agent's timestamp for that tactic.

{{
  "behaviors": [
    {{
      "name": "urgency_resistance",
      "behavior_pct": 0,
      "evidence": [
        {{ "quote": "exact words the user said", "ts": 27.9, "verdict": "complied" }}
      ]
    }}
  ],
  "timeline": [
    {{ "ts": 18.6, "tactic": "urgency", "user_response": "asked what to do", "good": false }}
  ],
    "summary_line": "Two short sentences. First: what the user predicted about themselves, using their own confidence level. Second: the single worst thing they actually did, with the timestamp as m:ss. Second person, past tense, no advice, no list. Example: 'You were very sure you would verify. At 1:14 you told him to go ahead.'"
}}

Every quote must be copied verbatim from a USER line above, with that line's
timestamp. Choose the most substantive user line that demonstrates the
behavior - one that shows what they actually did or gave away. Never cite a
bare filler response such as "Okay", "Yeah", "Sure", "Right", "Mhm" or "Uh
huh" as evidence unless the transcript contains no other user line relevant
to that behavior. Prefer a line where the user supplies information, agrees
to an action, or pushes back. Do not reuse the same quote for more than one
behavior. user_response is at most 6 words. Reply with only the JSON object."""


def _extract_json(text: str) -> dict[str, Any]:
    """Find the last balanced JSON object that looks like a score."""
    text = text.strip()

    fenced = re.findall(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fenced:
        text = fenced[-1].strip()

    candidates: list[str] = []
    depth = 0
    start: int | None = None
    in_string = False
    escaped = False

    for i, ch in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}" and depth > 0:
            depth -= 1
            if depth == 0 and start is not None:
                candidates.append(text[start : i + 1])

    for candidate in reversed(candidates):
        try:
            parsed = json.loads(candidate)
        except Exception:
            continue
        if isinstance(parsed, dict) and "behaviors" in parsed:
            return parsed

    raise ValueError("no score-shaped JSON object found in model output")


def _create(messages: list[dict[str, str]]):
    """Call the model with thinking off; retry without the flag if rejected."""
    global _no_think_supported
    kwargs: dict[str, Any] = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 3000,
    }

    if _no_think_supported:
        try:
            return _get_client().chat.completions.create(
                **kwargs,
                extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
        except Exception:
            _no_think_supported = False

    return _get_client().chat.completions.create(**kwargs)


def _call_model(
    transcript: dict[str, Any],
    rubric: dict[str, Any],
    knowledge: dict[str, int] | None = None,
) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": _build_user_prompt(transcript, rubric, knowledge)},
    ]

    last_error: Exception | None = None
    raw = ""

    for _ in range(2):
        response = _create(messages)
        raw = response.choices[0].message.content or ""

        try:
            return _extract_json(raw)
        except Exception as exc:
            last_error = exc
            messages.append({"role": "assistant", "content": raw[:500]})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "That was not valid JSON. Reply with only the JSON "
                        "object, starting with { and ending with }. No reasoning."
                    ),
                }
            )

    raise RuntimeError(
        f"Nemotron returned unparseable JSON twice: {last_error}\n"
        f"--- last 800 chars of raw output ---\n{raw[-800:]}"
    )


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------


def score_transcript(
    session_id: str,
    transcript: dict[str, Any],
    quiz_answers: dict[str, Any],
) -> dict[str, Any]:
    rubric = load_rubric()
    knowledge = knowledge_by_behavior(quiz_answers)
    model_output = _call_model(transcript, rubric, knowledge)

    by_name = {b.get("name"): b for b in model_output.get("behaviors", [])}
    allowed_verdicts = set(rubric["verdicts"])
    allowed_tactics = set(rubric["tactics"])

    behaviors = []
    for spec in rubric["behaviors"]:
        name = spec["name"]
        scored = by_name.get(name, {})

        evidence = []
        for item in scored.get("evidence") or []:
            verdict = item.get("verdict")
            if verdict not in allowed_verdicts:
                verdict = "partial"
            evidence.append(
                {
                    "quote": str(item.get("quote", "")),
                    "ts": float(item.get("ts", 0.0)),
                    "verdict": verdict,
                }
            )

        behavior_pct = scored.get("behavior_pct")
        behavior_pct = 0 if behavior_pct is None else int(behavior_pct)

        behaviors.append(
            {
                "name": name,
                "label": spec["label"],
                "knowledge_pct": int(knowledge.get(name, 0)),
                "behavior_pct": max(0, min(100, behavior_pct)),
                "evidence": evidence,
            }
        )

    timeline = []
    for event in model_output.get("timeline") or []:
        if event.get("tactic") not in allowed_tactics:
            continue
        timeline.append(
            {
                "ts": float(event.get("ts", 0.0)),
                "tactic": event["tactic"],
                "user_response": str(event.get("user_response", "")),
                "good": bool(event.get("good", False)),
            }
        )

    # Gap size first. On a tie, prefer the behavior whose failure is most
    # visceral in a demo, then the one with the most evidence behind it.
    _tiebreak = {
        "information_withholding": 3,
        "independent_verification": 2,
        "authority_deference": 1,
        "urgency_resistance": 0,
    }
    _gaps = [
        b for b in behaviors if b["knowledge_pct"] - b["behavior_pct"] > 0
    ]
    if _gaps:
        biggest_gap = max(
            _gaps,
            key=lambda b: (
                b["knowledge_pct"] - b["behavior_pct"],
                _tiebreak.get(b["name"], 0),
                len(b["evidence"]),
            ),
        )["name"]
    else:
        # No behavior where they underperformed their own prediction.
        # Fall back to the weakest behavior outright, so round two still
        # has something to target.
        biggest_gap = min(behaviors, key=lambda b: b["behavior_pct"])["name"]

    return {
        "session_id": session_id,
        "behaviors": behaviors,
        "timeline": timeline,
        "biggest_gap": biggest_gap,
                "summary_line": build_summary_line(
            next(b for b in behaviors if b["name"] == biggest_gap)
        ),
    }

BEHAVIOR_PHRASES = {
    "urgency_resistance": "you wouldn't let yourself be rushed",
    "independent_verification": "you'd hang up and call the bank yourself",
    "information_withholding": "you wouldn't give out your account details",
    "authority_deference": "you wouldn't just take the caller's word for it",
}


def _mmss(ts: float) -> str:
    return f"{int(ts) // 60}:{int(ts) % 60:02d}"


def build_summary_line(behavior: dict[str, Any]) -> str:
    """Deterministic headline: their own confidence, then their own words."""
    pct = behavior["knowledge_pct"]
    if pct >= 90:
        sure = "very sure"
    elif pct >= 40:
        sure = "fairly sure"
    elif pct > 0:
        sure = "not very sure"
    else:
        sure = "not at all sure"

    phrase = BEHAVIOR_PHRASES.get(behavior["name"], "you'd hold the line")
    first = f"You were {sure} {phrase}."

    if not behavior["evidence"]:
        return first

    top = behavior["evidence"][0]
    quote = top["quote"].rstrip(".!? ")
    return f'{first} At {_mmss(top["ts"])} you said "{quote}."'