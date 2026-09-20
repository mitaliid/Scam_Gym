"""Compare Nemotron model sizes on the same eval set.

Usage: python3 eval_models.py [runs]
"""

import json
import statistics
import sys
import time
from pathlib import Path

import scoring
from eval_run import CASES, load_case, verdict_of

ROOT = Path(__file__).resolve().parent.parent

MODELS = [
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
]


def evaluate(model: str, labels: dict, runs: int) -> dict:
    scoring.MODEL = model
    agree = total = 0
    latencies = []
    per_behavior: dict[str, list[int]] = {}
    failures = 0

    for case_name, path, quiz in CASES:
        transcript, answers = load_case(path, quiz)
        truth = labels[case_name]

        for _ in range(runs):
            start = time.time()
            try:
                result = scoring.score_transcript(case_name, transcript, answers)
            except Exception as exc:
                failures += 1
                print(f"    FAILED {case_name}: {type(exc).__name__}")
                continue
            latencies.append(time.time() - start)

            for behavior in result["behaviors"]:
                name = behavior["name"]
                if name not in truth:
                    continue
                total += 1
                hit = verdict_of(behavior) == truth[name]
                agree += hit
                slot = per_behavior.setdefault(name, [0, 0])
                slot[0] += hit
                slot[1] += 1

        print(f"    {case_name} done")

    return {
        "model": model,
        "agreement_pct": round(100 * agree / total) if total else 0,
        "judgements": total,
        "parse_failures": failures,
        "median_latency_sec": round(statistics.median(latencies), 1) if latencies else None,
        "by_behavior": {
            k: round(100 * v[0] / v[1]) for k, v in sorted(per_behavior.items())
        },
    }


def main():
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    labels = json.loads((ROOT / "eval/labels.json").read_text())["labels"]
    original = scoring.MODEL
    results = []

    for model in MODELS:
        print(f"\n{model}")
        results.append(evaluate(model, labels, runs))

    scoring.MODEL = original

    print("\n" + "=" * 72)
    print(f"{'model':<38} {'agree':>7} {'latency':>9} {'fails':>7}")
    print("-" * 72)
    for r in results:
        lat = f"{r['median_latency_sec']}s" if r["median_latency_sec"] else "n/a"
        print(f"{r['model']:<38} {r['agreement_pct']:>6}% {lat:>9} {r['parse_failures']:>7}")

    print("\nBy behavior:")
    usable_results = [r for r in results if r["usable"]]
    if len(usable_results) < 2:
        print("  only one model returned results; no comparison available")
    else:
        behaviors = sorted(usable_results[0]["by_behavior"])
        header = "".join(f"{r['model'].split('/')[-1][:11]:>12}" for r in usable_results)
        print(f"{'behavior':<28}{header}")
        for b in behaviors:
            row = "".join(f"{r['by_behavior'].get(b, 0):>11}%" for r in usable_results)
            print(f"{b:<28}{row}")

    (ROOT / "eval/model_comparison.json").write_text(json.dumps(results, indent=2))
    print("\nSaved eval/model_comparison.json")


if __name__ == "__main__":
    main()
