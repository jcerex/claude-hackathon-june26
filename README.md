# Claude Hackathon — "Throughline"

> Codename. **A passively-collected recovery trend line for sciatica** — the chart you're glued to during a severe flare, except it fills itself in from your phone and wearable, and Opus 4.8 tells you honestly which way you're heading.

## Files
| File | What it is |
|---|---|
| [`brief.md`](brief.md) | Problem, insight, ODI analysis, data sources, scope, criteria map |
| [`plan.md`](plan.md) | Architecture, Build-Day timeline, demo script, the model-verifiable "done"/eval |
| [`docs/methodology-evidence.md`](docs/methodology-evidence.md) | Full empirical record — gait↔MODQ analysis, validation results, claims scorecard |
| [`docs/open-datasets.md`](docs/open-datasets.md) | External open datasets for validation & the leading-signal track (gait, ODI, HRV/sleep) |
| [`concepts/tributary/`](concepts/tributary/) | **Archived** — the earlier crowd-sourced-RWE concept, kept as a fallback. Its `rubric.md` + workflow pattern still transfers. |

## One-line pitch
Turn the Oswestry Disability Index from a survey you fill out into a signal that's just there. Opus fuses your real passive data (gait, sleep, activity) into a continuous recovery index, calibrates it against the occasional real ODI, and narrates the trend — honestly, trends-not-points, to fight the catastrophizing that severe sciatica feeds.

## The unfair advantage
**You are the dataset.** The demo runs on Jamie's own Apple Health export across a real flare and recovery — no fake data, no sourced scans. The real ODI scores landing on the passively-estimated line *is* the proof.

## Build Day, in one line
Parse a real Apple Health export → estimate an ODI-shaped index (numbers in JS, fusion/calibration by Opus) → narrate the trend → verify it tracks the real ODI within tolerance → deploy. See `plan.md`.
