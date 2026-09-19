import json
from pathlib import Path
import scoring

transcript = json.loads(
    (Path(__file__).parent.parent / "eval/transcripts/sample_compliant.json").read_text()
)
quiz_answers = {"q1": "c", "q2": "c", "q3": "c", "q4": "c"}

print("Model:", scoring.MODEL)
print("Confidence from quiz:", scoring.knowledge_by_behavior(quiz_answers))
print("Calling Nemotron, this takes 10-30 seconds...\n")

result = scoring.score_transcript("fixture_compliant", transcript, quiz_answers)
print(json.dumps(result, indent=2))
