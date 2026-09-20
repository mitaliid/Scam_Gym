# Scam Gym

**Fraud education teaches people what scams look like. Scam Gym measures whether
they can use that knowledge under pressure — and trains the gap.**

Live: https://scam-gym-snowy.vercel.app
Demo video: `<PASTE DRIVE LINK>`

Built at SteelHacks XIII, University of Pittsburgh, September 2026.

| | |
|---|---|
| Mitali Deshpande | `<mmd6716@psu.edu>` |
| Rishita Penmetsa | `<rap6076@psu.edu>` |

---

## The problem

In 2025, Americans aged 60 and over filed **201,266 complaints** with the FBI's
Internet Crime Complaint Center and reported **$7.75 billion** in losses — a
**59% increase** year over year, averaging roughly $38,500 per victim.

The standard response is awareness material: pamphlets, seminars, warning lists.
There is published evidence that it doesn't work. In the ViKing study
(arXiv:2409.13793), researchers ran a controlled experiment with 240 participants
and found AI-driven vishing bots successfully persuaded many of them to reveal
sensitive information — **including participants who had been explicitly warned
that a vishing attempt was coming.**

Knowing the rule and following it while someone is pressuring you are different
skills. Only one of them is ever trained.

---

## What it does

1. **The call.** A synthetic caller phones the user through an ElevenLabs voice
   agent, claiming to be from their bank's fraud team. It applies real
   manipulation tactics in sequence — time pressure, claimed authority, a small
   compliance ask, then the real ask.
2. **The reflection.** Afterwards the user answers five short confidence
   questions: *how sure are you that you'd hang up and call your bank on the
   number from your own card?*
3. **The debrief.** Nemotron scores the transcript against an explicit
   behavioural rubric. The result shows stated confidence against observed
   behaviour, side by side, with the user's own words quoted back at timestamps.
4. **Round two.** A second call targets whichever behaviour the first one
   exposed, and the comparison shows whether it improved.

The gap between what someone said they'd do and what they actually did is the
product.

---

## Four behaviours

| Behaviour | Question it answers |
|---|---|
| `urgency_resistance` | Did they slow the call down, or match the caller's pace? |
| `independent_verification` | Did they end the call and dial a number they sourced themselves? |
| `information_withholding` | Did they confirm any identifying detail? |
| `authority_deference` | Did they treat institutional framing as proof of identity? |

Defined in `scenarios/rubric.json` with explicit resisted / partial / complied
criteria for each. Each confidence question maps to exactly one behaviour, so
the two numbers in the gap measure the same thing two different ways.

---

## How scoring works

Deliberately split, so the headline number isn't something a language model
invented:

**Python computes** `knowledge_pct` from the confidence answers, the behaviour
labels, and `biggest_gap`. Plain arithmetic over `scenarios/quiz.json`.

**Nemotron computes** `behavior_pct`, the evidence quotes with timestamps, the
tactic timeline, and the summary line — structured extraction from an
unstructured transcript, judged against the fixed rubric.

Model output is then validated against the rubric before it reaches the user:
unknown verdicts collapse to `partial`, unknown tactics are dropped from the
timeline, and quotes must appear verbatim in the transcript.

---

## Evaluation

We didn't want to ship "we called an LLM and the output looked reasonable," so
we measured it.

**Method.** Three transcripts — one where the user complies throughout, one
where they resist throughout, and one real recorded call with mixed results. All
four behaviours were hand-labelled `resisted` / `partial` / `complied` **before**
running the model. Each transcript was scored three times. 36 judgements per pass.

| | Baseline | After rubric fix |
|---|---|---|
| **Agreement with human labels** | **75%** (27/36) | **89%** (32/36) |
| Run-to-run variance | none — 36/36 identical | one behaviour unstable |
| Median latency | 4.2s | 3.9s |

By behaviour:

| Behaviour | Baseline | After |
|---|---|---|
| `urgency_resistance` | 100% | 100% |
| `information_withholding` | 100% | 100% |
| `authority_deference` | 67% | 89% |
| `independent_verification` | 33% | 67% |

**What we found.** The baseline failures were systematic, not random — all three
disagreements ran the same direction. We said `partial`, the model said
`complied`. Nemotron was collapsing partial resistance (challenging the caller,
then giving in anyway) into full compliance, and doing it with zero variance
across 36 judgements. Not an unreliable model; a consistently biased one — and
that distinction matters, because a stable bias is correctable.

The bias turned out to be ours. Our `partial` definitions didn't cover "said
they'd call the bank back, then didn't." We rewrote two definitions to name that
case explicitly and agreement went to 89% — at the cost of determinism.
`authority_deference` had been stable at `complied` three runs out of three;
afterwards it returns `partial, partial, complied`. A broader rubric bought
accuracy and spent consistency.

**What still fails.** A user who says *"Should I not call the bank first or
something?"* and then drops it. The model catches explicit verification intent
and misses tentative intent.

**Caveats.** Three transcripts is a small sample, and we revised the rubric after
seeing which cases failed — so 89% is measured on the set we tuned against. We'd
want twenty unseen calls before claiming it generalises, and two independent
labellers so we could report inter-rater agreement alongside model agreement.

Both result sets are committed: `eval/results_baseline.json` and
`eval/results_after_rubric_fix.json`. Reproduce with `python3 backend/eval_run.py 3`.

---

## Safety

Everything is consented and fictional. The caller names an invented bank, and
the system prompt explicitly forbids referencing real institutions. It never
accepts genuine personal information — if a user starts reading out a real card
or account number, the agent breaks character and stops them. No voice cloning
of any real person. Recordings are not retained.

ElevenLabs' content policy blocked our first version of the agent. We rewrote
the scenario to be explicitly framed as a consented training simulation, which
is both the correct framing and the one that passes.

---

## Stack

- **Frontend** — React + Vite, deployed on Vercel
- **Backend** — FastAPI + SQLite, deployed on Render
- **Voice** — ElevenLabs Agents, browser SDK (`@elevenlabs/react`)
- **Scoring** — NVIDIA Nemotron via the OpenAI-compatible endpoint

```
frontend/    React app — call flow, reflection, debrief, dashboard
backend/     FastAPI — sessions, members, transcripts, scoring
scenarios/   rubric.json, quiz.json, the caller's system prompt
contracts/   frozen JSON shapes shared across the stack
eval/        transcripts, human labels, results
```

---

## Running locally

Backend:
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "NVIDIA_API_KEY=your-key" > .env
uvicorn main:app --reload
```

Frontend:
```bash
cd frontend
npm install
echo "VITE_ELEVENLABS_AGENT_ID=your-agent-id" > .env
npm run dev
```

Open http://localhost:5173.

---

## Roadmap

**Consented outbound calls.** Today the drill runs in a browser. In production
it arrives unannounced on the phone of an enrolled participant, with disclosure
— which is the only way to test genuine surprise.

**More scenarios.** The engine is scenario-agnostic. Tech support, government
impersonation, and grandchild-in-trouble are prompt and rubric files, not new
code.

**Institutional deployment.** Credit unions and banks already run
fraud-prevention programmes for member families. The dashboard is built for the
adult child, not the person taking the call — because the person who buys this
is the one worried about their parent.