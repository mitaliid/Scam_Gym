import json, traceback
from pathlib import Path
import scoring

data = json.loads((Path(__file__).parent.parent / "eval/raw_session_01.json").read_text())

transcript = data.get("transcript", data)
quiz = data.get("quiz") or data.get("quiz_answers") or {}

print("turns:", len(transcript.get("turns", [])))
print("quiz:", quiz)
print("scoring...\n")

try:
    result = scoring.score_transcript("debug_real", transcript, quiz)
    print(json.dumps(result, indent=2))
except Exception:
    traceback.print_exc()
