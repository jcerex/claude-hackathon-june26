# sources/ — pluggable data connectors

Each connector pulls one data source and writes a small JSON into `../data/`, which
`scripts/build_seed.py` merges into `seed.json` (→ `daily_signals` / `events`). Adding a
source = add an adapter here + a merge line in `build_seed.py`. The same contract ports to iOS
(swap the adapter; the schema is unchanged).

| Connector | Source | Auth | Covers the 2025 episode? | Output |
|---|---|---|---|---|
| `../parse_health.py` (repo root) | Apple Health export (`export.xml`) | none (file) | ✅ gait/activity | `daily_signals.csv` |
| `weather.py` | Open-Meteo archive | **none** | ✅ **backfills pressure/temp** | `data/weather.json` |
| `whoop.py` | Whoop API v1 | `WHOOP_ACCESS_TOKEN` env | ❌ no device then → forward-looking only | `data/whoop.json` |

## Why these
From `../../docs/methodology-evidence.md`: gait is a *consequence* signal (great for tracking,
useless for onset). The leading signals we still need are **sleep/HRV** (Whoop, forward) and
**exposure/weather** (Open-Meteo backfills the episode; calendar exposure is logged in `events`).

## Not available as MCP connectors
The session registry has no health/wearable/weather/calendar MCP connector — and MCP is for
pulling data into Claude's context, not the app. The app integrates vendor APIs directly (above),
or via an aggregator (Terra / Vital / Spike) if multi-device support is needed later.

## Run
```sh
python3 sources/weather.py              # backfills the episode — free, no auth
WHOOP_ACCESS_TOKEN=... python3 sources/whoop.py   # forward recovery data (optional)
pnpm seed                               # merges everything into seed.json
```
Secrets go in `.env` (git-ignored) — never commit a token or paste it in chat.
