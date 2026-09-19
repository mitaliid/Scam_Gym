import json
from pathlib import Path
import scoring

transcript = json.loads(
    (Path(__file__).parent.parent / "eval/transcripts/sample_compliant.json").read_text()
)
rubric = scoring.load_rubric()
raw = scoring._call_model(transcript, rubric)

print("RAW TIMELINE FROM MODEL:")
print(json.dumps(raw.get("timeline"), indent=2))
print("\nALLOWED TACTICS:", rubric["tactics"])
