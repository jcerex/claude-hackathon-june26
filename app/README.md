# Throughline — app

Personal recovery-trajectory companion. **Web app (v1)**; ports to iOS later (HealthKit + GRDB reuse `db/schema.sql`).

## Stack
- **Vite + React + TypeScript** front-end (Chart.js).
- **Hono** server (`@hono/node-server`) — API + serves the built client in prod.
- **better-sqlite3** at `DATABASE_PATH` (a **Fly volume** in prod, `dev.db` locally).
- The "brain" (forecast + risk + Opus narration) is computed **offline** and written into `timeline`; the app just reads & replays.

## Run locally
```sh
pnpm install
pnpm seed        # builds data/seed.json from ../daily_signals.csv, ../calibration.json, ../modq_items.csv
pnpm dev         # client :5173 (proxies /api → server :8080)
```
On first boot the server applies `db/schema.sql` and seeds `dev.db` from `data/seed.json` if empty.

## Deploy (Fly.io)
Live: **https://throughline-spine.fly.dev** (app `throughline-spine`, region `sjc`). `throughline` was taken globally, hence the suffix. To reproduce from scratch:
```sh
fly apps create <name> --org personal
fly volumes create throughline_data --region sjc --size 1 --app <name>
fly deploy --app <name> --ha=false        # --ha=false → exactly one machine
```
- **One machine only** — SQLite is single-writer and the volume is per-machine (`min_machines_running = 1`; do not `scale count > 1`).
- **`packageManager: pnpm@10.10.0`** is pinned in `package.json` so the Docker build's corepack uses the same pnpm as local. pnpm 11 ignores `pnpm.onlyBuiltDependencies` (breaks the native `better-sqlite3` build) and enforces a `minimumReleaseAge` policy that rejects same-day dependency publishes — both fail the build.
- DB lives on the volume at `/data/throughline.db`; seeded on first boot from the bundled `data/seed.json`.

## Data model — `db/schema.sql`
`daily_signals` · `surveys` · `survey_items` · `events` · `timeline` (precomputed companion output) · `meta` (calibration params). Reused verbatim on iOS.

## MCP server (the Opus connector — "I gave Opus my spine")
A remote MCP server is mounted at **`/mcp`** on the same Hono listener (`server/mcp.ts`), reading the same SQLite DB. It uses the `@modelcontextprotocol/sdk` **Streamable HTTP** transport in **stateless** mode (a fresh server per request — no session state to share, which suits the single-machine SQLite deploy). Tools:

| Tool | Returns |
|---|---|
| `get_trajectory(days?)` | recovery-index direction, band, 7-day trend, turning points, today's narration, surveys-in-window |
| `get_risk(days?)` | flare-risk read — current score + flags (`over_exertion` / `high_exposure` / `pressure_swing`) + history |
| `get_evidence()` | the proven-vs-not scorecard + key validation numbers |
| `run_checkin(...10 MODQ items 0–5...)` | records a conversationally-administered MODQ; reports the scored total + band |

The **honesty rubric is baked into the server `instructions` and every tool's output**, so Opus reasons with the right discipline even without the skill loaded. The companion skill lives at `skills/throughline-companion/SKILL.md` — ship it alongside the connector for the full conversational discipline (esp. how to run the MODQ before calling `run_checkin`).

**Local smoke test** (stateless, so each call stands alone):
```sh
curl -s -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -X POST http://localhost:8080/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_trajectory","arguments":{"days":14}}}'
```

**Connect in claude.ai** (the app is deployed — see below): Settings → Connectors → **Add custom connector** → URL `https://throughline-spine.fly.dev/mcp` (authless). Then ask *"how's my back this week — am I at risk?"* → Opus answers from real data, honestly. That's the demo closer.

> ⚠️ The connector is **authless** and serves personal health data. Fine for a private demo on a non-guessable URL; for anything shared, put it behind OAuth or de-identify the seed.

## Check-in UI (the conversational-Opus moment)
`src/CheckIn.tsx` is a chat panel that drives `POST /api/interview` — Opus conducts the Modified Oswestry as a short conversation, scores it, and the point lands on the chart (a fresh check-in is dated today, so the x-axis unions timeline + survey dates). Voice is via the browser **Web Speech API**: 🎙 mic (`SpeechRecognition`, auto-sends) and a 🔊 toggle (`SpeechSynthesis`); both feature-detected, text is the baseline.

The interviewer needs **`ANTHROPIC_API_KEY`** — put it in `app/.env` (`echo 'ANTHROPIC_API_KEY=sk-ant-...' > app/.env`); the server loads it on boot via `process.loadEnvFile`. **In prod, set it as a Fly secret**, not in `.env`:
```sh
fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a throughline-spine && fly deploy -a throughline-spine
```
`.env` is now git- and docker-ignored. (Heads-up: an earlier image build bundled `app/.env` before the `.dockerignore` fix — the next deploy strips it.) The MCP connector does **not** need the key.

## Notes
- `data/seed.json` contains personal health data — git-ignored, but **bundled into the Fly image** for first-boot seeding (this is a private app). For a shared deploy, seed the volume out-of-band instead.
- Methodology + evidence: `../docs/methodology-evidence.md`.
