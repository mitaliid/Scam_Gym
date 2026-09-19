import json
from pathlib import Path
import scoring

transcript = json.loads(
    (Path(__file__).parent.parent / "eval/transcripts/sample_resistant.json").read_text()
)
quiz_answers = {"q1": "b", "q2": "b", "q3": "a", "q4": "b"}

result = scoring.score_transcript("fixture_resistant", transcript, quiz_answers)
print(json.dumps(result, indent=2))

with open(Path(__file__).parent.parent / "eval/sample_score_resistant.json", "w") as f:
    json.dump(result, f, indent=2)
print("\nSaved to eval/sample_score_resistant.json")
