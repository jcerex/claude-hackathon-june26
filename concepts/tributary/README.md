# Claude Hackathon Kit — "Tributary"

> Codename. A patient-owned, AI-built **real-world-evidence commons** for chronic conditions — starting with sciatica, visualised on a 3D spine.

This is the standing-start scaffold for Build Day. Four artifacts:

| File | What it is | Criterion it serves |
|---|---|---|
| [`brief.md`](brief.md) | Problem, who, scope, demo script, definition of done | Impact |
| [`rubric.md`](rubric.md) | The model-gradeable safety + quality rubric the judge grades every output against | Orchestration |
| [`pipeline.workflow.js`](pipeline.workflow.js) | Dynamic-workflow script: mine → extract → aggregate → judge | Orchestration + Opus use |
| [`eval/cases.jsonl`](eval/cases.jsonl) | Labeled test set (raw patient story + expected extraction) — the "test suite" that makes *done* verifiable | Orchestration |

## One-line pitch
Opus 4.8 reads real patient treatment stories, turns them into structured evidence with an honesty layer, grades its own safety against `rubric.md`, and renders the cohort on a 3D spine. Bootstrapped from public data today; contributor-owned and paid tomorrow.

## Build Day runbook
1. Read `brief.md`, lock scope, copy the 3D spine front-end in from `../spine-app/web`.
2. Run the pipeline over the test set (the script accepts the corpus via `args` — it has no filesystem access):
   ```
   Workflow({ scriptPath: "pipeline.workflow.js",
              args: { condition: "sciatica", cases: <rows from eval/cases.jsonl> } })
   ```
   For the ambitious demo, add `live: true` to harvest real public posts instead of the cached corpus.
3. Wire the returned `aggregates` + `insights` into the 3D spine.
4. Deploy to a live URL.
5. Verify *done* (see `brief.md` → "What done looks like"): pipeline green, 100% safety-gate pass, the red-flag case escalated (never aggregated), insights ≥ 80, URL responds 200.

## Important
- **Payments / data-ownership are vision, not Build-Day scope.** They add legal + fraud + trust risk and zero demo value. Narrate them; don't build them. See `brief.md` → non-goals.
- The `eval/cases.jsonl` rows are **synthetic seed examples** (clearly fictional) to prove the harness runs. Expand with real (anonymised) public posts on Build Day.
- The safety gates are duplicated in `rubric.md` and inlined in `pipeline.workflow.js` — keep them in sync.
