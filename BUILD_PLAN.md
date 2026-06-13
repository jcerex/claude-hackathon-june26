# Throughline — Build Plan & Handoff

> Hand this to a fresh Claude session. **Read the Orientation files first**, then execute the tasks. Don't re-derive decisions already recorded here — they were made over a long prior session.

## What this is (one line)
A spine-recovery companion: passive phone/wearable data → a calibrated recovery-trajectory index, a conversational MODQ check-in run by Claude, honest narration, and a flare-risk read — built to **show off Opus to the Anthropic judging team**.

## Orientation — read these first, in order
1. `brief.md` — vision, positioning, three pillars, judging-criteria map, demo, definition of "done".
2. `narrative.md` — the founder story (use the voice verbatim).
3. `docs/methodology-evidence.md` — **the evidence backing**: what's proven vs not, the scorecard, limitations. This is the soul of the project.
4. `app/README.md` + `app/sources/README.md` — stack + connector layer.
5. This file — current state + remaining tasks.

## Hard guardrails (YMYL + the judges build Claude — do not violate)
- **Do NOT claim "Opus predicts flare-ups."** Gait is a *consequence* signal; onset prediction is unproven (n=1, lead/lag was coincident-not-leading). Early-warning is the **narrated north-star**, never a stated result.
- **Positioning = Opus as scientist + skeptic + companion; honesty is the flex.** Approved hook (in `brief.md`): *"I tried to teach Opus to predict my flare-ups — here's what it actually learned, including where it told me to stop overclaiming."*
- **Trends not points · no diagnosis · no precise prognosis · associations not causation · escalate on sustained worsening.**
- The product **ships its own "proven vs not" scorecard** (the Evidence screen). Honesty is a feature, not a disclaimer.

## Decisions already made (don't relitigate)
- **Web app** (Vite + React + TS, Hono, better-sqlite3) on **Fly.io** with a **volume-backed SQLite** at `/data/throughline.db`, **one machine** (SQLite is single-writer). Rationale: live URL, fast, and the data is a one-time export — no live HealthKit needed for v1.
- **iOS = future port** (HealthKit + GRDB reuse `db/schema.sql`); not Build Day.
- **Claude Managed Agents: NOT used** — wrong tier for our surfaces (single calls + MCP + a light voice layer is the correct, simplest tier).
- **Autonomous scheduled check-ins: deferred** — narrate the schedule; if made real later, a Fly *scheduled machine* does it (no new framework). The check-in *interaction* is demoed; the *schedule* is narrated.
- The "brain" computes the timeline **offline**; the app just reads & replays it.

## Current state — built and VERIFIED
Repo root: `/Users/jamie/apps/claude-hackathon/`. App: `app/`.
- ✅ **Dashboard** `app/src/App.tsx` — Chart.js: recovery index vs real MODQ on seeded data. (Screenshot confirmed.)
- ✅ **API** `app/server/index.ts` + `db.ts` — Hono; `/api/health|timeline|signals|surveys|events`; SQLite auto-seeds from `data/seed.json` on first boot. Schema in `db/schema.sql`.
- ✅ **Interviewer** `app/server/interview.ts` — `POST /api/interview`; Opus (`claude-opus-4-8`) conducts the MODQ via a strict `submit_modq_score` tool, scores it, persists a survey. Typechecked + verified live. **Needs `ANTHROPIC_API_KEY`** (loaded from `app/.env` locally). **Check-in UI built** — see Task 2.
- ✅ **Deterministic brain** `app/scripts/brain.py` — forecast band + over-exertion/exposure/pressure risk + trend + turning points + template narration → `data/timeline.json` → `timeline` table.
- ✅ **Connectors** `app/sources/` — `weather.py` (Open-Meteo, real pressure backfilled), `whoop.py` (forward, token via env). Apple gait source = `parse_health.py` (repo root).
- ✅ **Validation workflow** `app/scripts/brain.workflow.js` — dynamic Workflow: agentic verdict + per-day narration graded vs the honesty rubric. Authored; run on Build Day with `Workflow({scriptPath, args})`.
- ✅ **Analysis** (repo root) `calibrate.py` (R²=0.69, MAE 9.1, LOO 10.5), `analysis.py` (circularity + forward-validation), `leadlag.py`.
- ✅ **MCP server** `app/server/mcp.ts` — remote MCP (Streamable HTTP, stateless) at `/mcp` on the same listener, reading the same DB. Tools: `get_trajectory`, `get_risk`, `get_evidence`, `run_checkin`. Honesty rubric baked into server `instructions` + every tool output. Companion skill at `app/skills/throughline-companion/SKILL.md`. **Typechecked + locally smoke-tested (initialize, tools/list, all 4 tools/call, run_checkin DB write verified).** Remaining: `fly deploy` + connect in claude.ai (manual, outward-facing — publishes personal health data on an authless URL).

Data files (`*.csv`, `*.json`, `dev.db`, `apple_health_export/`, `*.HEIC`) are **git-ignored** (personal health data). Regenerate via the runbook.

## Remaining build — the demoable core (each task can be its own session)

### Task 1 — MCP server + honesty skill  [HIGH — the "I gave Opus my spine" closer]  ✅ BUILT + LOCALLY VERIFIED (deploy pending)
- ✅ Remote MCP server (`@modelcontextprotocol/sdk`, Streamable HTTP, **stateless**) at `/mcp` on the existing Hono listener, reading the same SQLite DB. Tools: `get_trajectory`, `get_risk`, `get_evidence` (the scorecard), `run_checkin`.
- ✅ Skill `app/skills/throughline-companion/SKILL.md` carries the honesty rubric + data-talk discipline + how to run the conversational MODQ before `run_checkin`. Rubric is also baked into the server `instructions` + every tool output (works even without the skill).
- ✅ Deployed on Fly: **https://throughline-spine.fly.dev** (app `throughline-spine`, region `sjc`, 1 machine, volume-backed SQLite). `/mcp` verified live (`/api/health` 200; `get_trajectory` returns real data). `throughline` was taken globally → suffix.
- ✅ **`send_telegram` MCP tool + daily-reminder routine** — pushes an honest, Opus-composed nudge to Telegram (bot `@ThroughlineSpineBot`; token + chat_id are Fly secrets). Tested end-to-end (real pings, local + prod). Routine prompt in `app/README.md`. Honest framing: scheduled = reminder + passive read, not an unattended scored MODQ (the interactive check-in stays in-app). The *user* creates the Routine via `/schedule` / claude.ai Routines.
- ✅ **Calm redesign of the root page** ("a quiet companion at dawn"): warm paper theme, Fraunces + Hanken Grotesk, sage/clay palette, check-in as the breathing hero, a bespoke rising recovery curve, Evidence + detail chart moved to quiet secondary views. Check-in credits **Claude Opus 4.8**. Built, verified (desktop + mobile + live conversation), and deployed. Files: `app/src/{Home,CheckIn,Dashboard,Evidence,App}.tsx`, `styles.css`, `index.html`.
- ☐ **Connect it in claude.ai** (manual, only you can): Settings → Connectors → Add custom connector → `https://throughline-spine.fly.dev/mcp` (authless).
- **Acceptance:** in claude.ai, ask *"how's my back this week — am I at risk?"* → Opus answers from real data, honestly. This is the demo closer. (Already returns the honest, real-data answer when the tools are called — verified locally and against the live URL.)

### Task 2 — Voice + text check-in UI  [HIGH — the conversational-Opus moment]  ✅ BUILT + VERIFIED
- ✅ Chat panel `app/src/CheckIn.tsx` driving `/api/interview`; maintains the full `messages` array client-side (appends the returned `assistant` content blocks verbatim, then the user's reply). `postInterview` client in `app/src/api.ts`.
- ✅ Voice via **browser Web Speech API** — `SpeechRecognition` (🎙 mic, auto-sends on final result) + `SpeechSynthesis` (🔊 voice toggle). Feature-detected; text is the baseline.
- ✅ On `done:true`: green score banner + the point lands on the chart. `App.tsx` unions timeline+survey dates so a fresh (today-dated) check-in appears at the right; "Latest check-in" highlighted dataset.
- ✅ Server loads `app/.env` (`process.loadEnvFile`, guarded) so the interviewer gets `ANTHROPIC_API_KEY` in local dev. `.env` added to `.dockerignore` (it was being bundled into the image — see note).
- **Acceptance MET:** verified end-to-end — a full conversational MODQ scored live (Opus ran all 10 sections → MODQ 6/100) and the point lands on the trajectory; in-browser Start→first-question loop screenshotted.
- ⚠️ **Prod note:** the local `app/.env` was bundled into the Task-1 Fly image (`.dockerignore` didn't exclude it — now fixed). To run the in-app interviewer live on Fly, `fly secrets set ANTHROPIC_API_KEY=... -a throughline-spine` and redeploy (the redeploy also strips the leaked `.env` from the image). The MCP connector doesn't need the key.

### Task 3 — Front-end enrichment + Evidence screen  [MED]  ✅ BUILT + VERIFIED + DEPLOYED
- ✅ Chart (`app/src/Dashboard.tsx`): **nowcast uncertainty band** (`band_low/high`), **forward forecast cone** (`forecast_low/high` from the latest reading — naive per-day values left for Task 4 to damp), **risk-flag rug** (amber/red dots, days with `risk_flags`), **turning-point transition markers** (▲ green past-worst, ▼ red relapse-onset), and a **narration callout** (trend chip + today's narration + most-recent turning point).
- ✅ **Evidence screen** (`app/src/Evidence.tsx`): key-numbers grid + the proven-vs-not scorecard with status pills (Supported / Not supported / Suggestive / Untested), from `docs/methodology-evidence.md` §8. Tabbed nav in `App.tsx` (Trajectory ↔ Evidence).
- **Acceptance MET:** screenshots show band + risk + turning points + narration, and the Evidence scorecard.
- ✅ **Deployed** — Task 2 + Task 3 shipped to https://throughline-spine.fly.dev (verified: live UI asset hashes match the build; `/api/interview` returns a live MODQ question using the Fly `ANTHROPIC_API_KEY` secret). The leaked `app/.env` is stripped from this image (`.dockerignore` fix).

### Task 4 — Fix forecast damping  [SMALL]  ✅ DONE
- ✅ `brain.py` forecast replaced: naive linear (overshot to 0/100) → **damped trend that mean-reverts toward a natural-history recovery prior** (PRIOR=12, DAMP=0.82, REVERT=0.06 over a 14-day horizon). Re-ran `brain.py` → `build_seed.py`; `forecast_value` now ranges 1.4–72.1 (0/168 pinned at 100; worst flare day 86.5 → forecast 55.8; latest 22 → 15.3).
- ✅ Re-seed solved for the live volume: `db.ts` now treats `timeline` as precomputed output and **refreshes it from the seed on every boot**, while surveys/signals/events seed once — so a `brain.py` re-run lands on deploy without wiping the user's check-in. Verified on prod (damped forecast live; the `s-checkin` survey preserved).

### Task 5 — Extract `rubric.md` for submission  [SMALL]  ✅ DONE
- ✅ Top-level `rubric.md` written — validation gates (A), the 7 YMYL honesty gates (B), the proven-vs-not scorecard (C), model-verifiable "done" (D), key numbers (E), and how the deterministic brain + agentic self-grading enforce it (F). Submission set: brief + **rubric** + session log + live URL.

## Runbook
```sh
cd app
pnpm install                      # pnpm.onlyBuiltDependencies builds native better-sqlite3
python3 sources/weather.py        # -> data/weather.json (free, no auth)
python3 scripts/brain.py          # -> data/timeline.json
pnpm seed                         # -> data/seed.json (merges Apple gait + weather + index)
rm -f dev.db*; pnpm dev           # client :5173 (proxies /api -> server :8080)
# interviewer: echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```
Regenerate gait data (if needed): `python3 ../parse_health.py ../apple_health_export/export.xml 2024-09-01 2026-06-13` → `../daily_signals.csv`. `calibration.json` + `modq_items.csv` come from `../calibrate.py` and the recovery_tracker Postgres (see `docs/methodology-evidence.md` §Reproducibility).
Deploy: `fly apps create throughline && fly volumes create throughline_data --region syd --size 1 && fly deploy`. **One machine only.**
Screenshot: `pnpm start` (prod, serves UI+API on :8080), drive a browser to `localhost:8080`.

## Demo arc (≈4 min)
Story → **voice check-in** (Opus runs the MODQ live) → **trajectory** (real flare → Aug relapse → recovery; index tracks the MODQ) → **Evidence scorecard** ("what's proven / what I can't claim") → **MCP closer** in claude.ai ("am I at risk this week?"). Close: *"I didn't build an app. I taught Opus to understand a spine — honestly."*

## Honest open issues
- ✅ ~~Forecast naive until Task 4.~~ Fixed — damped mean-revert (Task 4).
- n=1, one episode — generalization unproven; state it.
- Interviewer + Telegram need `ANTHROPIC_API_KEY` / `TELEGRAM_*` — set locally in `app/.env` and as Fly secrets. (Bot token was shared in chat; rotate via BotFather if needed.) Workflow run needs Opus credits.
- Keep health data de-identified / episode-subset when mounting it anywhere external. The `/mcp` connector is authless on a non-guessable URL — fine for the private demo.
- All five build-plan tasks (1–5) are done; the calm redesign + Telegram reminder are extras, all deployed and verified live.

## Key numbers (don't misquote)
R²=0.69 · in-sample MAE 9.1 · LOO MAE 10.5 · forward MAE ~14.9 · block-test direction r=0.94 · circularity cleared (gait predicts pain r=0.79, sleep r=0.69) · lead/lag coincident-not-leading · onset acute (no gait precursor) · the one phone-only leading signal = over-exertion spikes (8 Aug). Episode: ER 27 Jun 2025 → MODQ trough 82 → relapse late Aug → recovered to 12 by 1 Oct.
