# Throughline — Build Day Brief

*Your spine, understood. Track your recovery — and work toward seeing the next flare before it hits.*

## The story (why this exists)

> A year ago I was in this room for the #1 AI Engineer hackathon. A week later I collapsed in the street from a flare-up of a spine injury — a 3-month experience of severe sciatica (spinal discs pressing on the nerves of the spinal column), chronic pain, stuck lying on the floor of my bedroom. A year on I've recovered 99%, but the underlying injury remains. And obsessing about minimising the risk of another flare-up is no way to live. So I built a harness around Claude Opus to manage this — for people with spine injuries.

## What it is
A spine-recovery companion. Plug in your data — Apple Health, Whoop, Oura, calendar — and Claude checks in with you on a regular but unobtrusive basis to fill the gaps, tracks your recovery passively, and is built toward warning you when you're on track for a flare.

## Who it's for, and the lifecycle
People living with a spine injury, across the cycle **stable → warning → flare → recovery**:
- **The engine (proven today):** passive recovery tracking + getting through a flare. Validated on real data — gait reconstructs the Modified Oswestry (MODQ), R²=0.69, direction r=0.94.
- **The north-star (the vision):** *"know about your next flare before it happens."* Honestly the **least-proven** piece — gait is a *consequence* of pain, not a predictor — so it's built and instrumented toward, not yet claimed.

## Three pillars
1. **Claude interviews you (the PROM, conversationally).** Instead of a 10-question form, Claude conducts the Modified Oswestry as a short, adaptive chat and maps it faithfully to the validated score — filling the calibration gaps painlessly (and far more pleasantly than a survey).
2. **Passive tracking (the engine).** Gait + activity → a calibrated recovery-trajectory index, with turning-point detection ("you're past the worst") and honest, counter-catastrophizing narration. **Trends, not points.**
3. **Leading-signal flare risk (the north-star).** Wearable sleep/HRV + calendar exposure + over-exertion spikes + a daily one-tap prodrome → a flare-risk read. An instrumented hypothesis, clearly labelled as such.

## How Opus earns it (the moat)
The hard part isn't fitting a line — it's *proving the signal is real*. Opus runs the whole methodology autonomously **and skeptically**: discovers which signals carry severity, calibrates to the validated score, then **attacks its own result** (circularity test, forward-validation, lead/lag) and **grades every output against a YMYL honesty rubric**. The model is scientist *and* reviewer. That self-auditing is the trust layer a health AI needs — and the "surprised even us" capability.

## Data sources (`app/sources/` — pluggable connectors)
Apple Health (gait — validated) · Whoop / Oura (sleep/HRV — forward) · calendar (exposure) · Open-Meteo (weather covariate, backfilled). Adapters drop in; the schema ports to iOS.

## How it maps to the judging criteria
| Criterion | Weight | Why |
|---|---|---|
| **Impact** | 35% | Low back pain is the world's #1 cause of disability (~600M). A companion that gets you through a flare today and works toward seeing the next one coming is real, urgent, and personal. |
| **Demo** | 35% | Runs on a **real, validated episode**. Opus re-runs the investigation live (calibrate → adversarially validate → honest verdict), the tracker replays the flare + relapse, and Claude interviews you to score the MODQ on the spot. |
| **Opus 4.8** | 15% | Conversational PROM administration + autonomous, *self-critiquing* data science + YMYL self-grading. Well beyond a chatbot. |
| **Orchestration** | 15% | The methodology **is** the workflow (ingest → discover → calibrate → ‖circularity · forward · lead/lag‖ → grade → emit). "Done" = passes the validation gates; reruns on any dataset. |

## Demo (~4 min)
1. **The story** — the narrative above, in your voice.
2. **Claude interviews you** — a 60-second conversational MODQ → a validated score, live.
3. **The engine** — the recovery index replays your real flare → relapse → recovery, with the turning point and the relapse caught; honest narration.
4. **The skeptic** — Opus re-derives + *adversarially validates* the index on screen (not tautology; direction holds; coincident-not-leading).
5. **The north-star** — the flare-risk read + the honest "here's what we can't yet claim" scorecard. "Built to see it coming."

## What "done" looks like (model-verifiable)
- Index tracks the real MODQ: **LOO MAE ≤ 12, r ≥ 0.8** (met: 10.5 / 0.83).
- Circularity cleared; forward-validation reported honestly.
- **100% of narrations pass the YMYL honesty rubric.**
- The interviewer's conversational score matches a held-out form score within tolerance.
- Deployed to a live URL (Fly), responds 200.

## Honesty spec (YMYL)
Trends not points · no diagnosis · no precise prognosis · early-warning labelled instrumented/unproven · escalation prompts on sustained decline · data user-controlled · the **"what's proven vs not" scorecard ships with the product** (see `docs/methodology-evidence.md`).

## Scope
**IN:** the app (track + interviewer + risk + narration) on the real episode, deployed.
**OUT (narrated, not built):** cross-condition generalization, *validated* onset prediction, clinical adoption.

## Architecture
Web (Vite + React + Hono + SQLite) on **Fly.io** (volume-backed DB). The "brain" computes the timeline offline; the **Claude interviewer** and the **agentic validation workflow** are the Opus surfaces. Methodology + evidence: `docs/methodology-evidence.md`.
