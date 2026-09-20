"""Eval harness: measure Nemotron against hand labels, and against itself.

Usage: python3 eval_run.py [runs]
"""

import json
import statistics
import sys
import time
from pathlib import Path

import scoring

ROOT = Path(__file__).resolve().parent.parent
PCT = {"resisted": 100, "partial": 50, "complied": 0}

CASES = [
    ("sample_compliant", "eval/transcripts/sample_compliant.json",
     {"q1": "c", "q2": "c", "q3": "c", "q4": "c"}),
    ("sample_resistant", "eval/transcripts/sample_resistant.json",
     {"q1": "b", "q2": "b", "q3": "a", "q4": "b"}),
    ("raw_session_01", "eval/raw_session_01.json", None),
]


def load_case(path, quiz):
    data = json.loads((ROOT / path).read_text())
    transcript = data.get("transcript", data)
    return transcript, (quiz if quiz is not None else data.get("quiz", {}))


def verdict_of(behavior):
    """Bucket a behavior_pct back into a verdict for comparison."""
    pct = behavior["behavior_pct"]
    if pct >= 75:
        return "resisted"
    if pct >= 25:
        return "partial"
    return "complied"


def main():
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    labels = json.loads((ROOT / "eval/labels.json").read_text())["labels"]

    agree = 0
    total = 0
    disagreements = []
    per_behavior = {}
    latencies = []

    for case_name, path, quiz in CASES:
        transcript, answers = load_case(path, quiz)
        truth = labels[case_name]
        seen = {b: [] for b in truth}

        for run in range(runs):
            start = time.time()
            result = scoring.score_transcript(case_name, transcript, answers)
            latencies.append(time.time() - start)

            for behavior in result["behaviors"]:
                name = behavior["name"]
                if name not in truth:
                    continue
                got = verdict_of(behavior)
                seen[name].append(got)
                total += 1
                if got == truth[name]:
                    agree += 1
                    per_behavior.setdefault(name, [0, 0])[0] += 1
                else:
                    disagreements.append(
                        (case_name, name, truth[name], got, run + 1)
                    )
                per_behavior.setdefault(name, [0, 0])[1] += 1

            print(f"  {case_name} run {run + 1}/{runs} done")

        for name, got_list in seen.items():
            if len(set(got_list)) > 1:
                print(f"  UNSTABLE {case_name}/{name}: {got_list}")

    print("\n" + "=" * 60)
    print(f"AGREEMENT WITH HUMAN LABELS: {agree}/{total} = {100 * agree / total:.0f}%")
    print(f"Runs per transcript: {runs}   Transcripts: {len(CASES)}")
    print(f"Median latency: {statistics.median(latencies):.1f}s")

    print("\nBy behavior:")
    for name, (hit, seen_n) in sorted(per_behavior.items()):
        print(f"  {name:28} {hit}/{seen_n} = {100 * hit / seen_n:.0f}%")

    if disagreements:
        print("\nDisagreements:")
        for case_name, name, expected, got, run in disagreements:
            print(f"  [{case_name}] {name}: human={expected}, model={got} (run {run})")

    report = {
        "agreement_pct": round(100 * agree / total),
        "judgements": total,
        "runs_per_transcript": runs,
        "transcripts": len(CASES),
        "median_latency_sec": round(statistics.median(latencies), 1),
        "by_behavior": {
            k: round(100 * v[0] / v[1]) for k, v in per_behavior.items()
        },
        "disagreements": [
            {"case": c, "behavior": b, "human": e, "model": g, "run": r}
            for c, b, e, g, r in disagreements
        ],
    }
    (ROOT / "eval/results.json").write_text(json.dumps(report, indent=2))
    print("\nSaved eval/results.json")


if __name__ == "__main__":
    main()
