import type { IncomingMessage, ServerResponse } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { db } from './db'

// ── The shared discipline ────────────────────────────────────────────────────
// Baked into the server instructions AND every tool's output so Opus reasons
// honestly even when the SKILL isn't loaded. Mirrors docs/methodology-evidence.md.
const HONESTY = `Throughline is a personalised, n=1 sciatica recovery companion. Speak in TRENDS, NOT POINTS.
- The recovery index is a calibrated *direction* estimate, not a precise score. Honest error is ±~15 MODQ points; it is biased and lags at turning points. Never quote the index as if it were an exact clinical number.
- Do NOT diagnose, do NOT give a precise prognosis, do NOT imply causation from association.
- Flare-risk is an INSTRUMENTED HYPOTHESIS, not a validated predictor. Gait is a *consequence* of pain, not a precursor — it cannot predict onset. The model does NOT predict flare-ups. The one phone-only *leading* signal is over-exertion (activity spikes), and even that is suggestive on a single episode.
- This is one person, one episode. Nothing here is clinically validated or generalisable.
- Escalate, don't reassure, on sustained worsening: escalating pain over days, new numbness/weakness, or any loss of bladder/bowel control are reasons to contact a clinician — not an app.`

const ESCALATE = `If the real-world picture is sustained worsening over days — escalating pain, new numbness or weakness, or any loss of bladder/bowel control — that is a reason to contact a clinician now, not to wait for an app.`

// The 10 Modified Oswestry sections (must match server/interview.ts).
const ITEMS = [
  'pain_intensity', 'personal_care', 'lifting', 'walking', 'sitting',
  'standing', 'sleeping', 'social_life', 'traveling', 'employment_homemaking',
] as const

// ── helpers ───────────────────────────────────────────────────────────────────
const txt = (s: string) => ({ content: [{ type: 'text' as const, text: s }] })

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function bandLabel(total: number): string {
  if (total <= 20) return 'minimal disability'
  if (total <= 40) return 'moderate disability'
  if (total <= 60) return 'severe disability'
  if (total <= 80) return 'crippling'
  return 'bed-bound / symptom-magnification range'
}

type TimelineRow = {
  date: string
  index_value: number | null
  band_low: number | null
  band_high: number | null
  trend: string | null
  turning_point: string | null
  risk_score: number | null
  risk_flags: string | null
  narration: string | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

// ── tool: get_trajectory ────────────────────────────────────────────────────
function getTrajectory(days: number) {
  const latest = db.prepare('SELECT MAX(date) AS d FROM timeline').get() as { d: string | null }
  if (!latest?.d) return txt('No trajectory has been computed yet. Run the brain (scripts/brain.py) and re-seed.')
  const asOf = latest.d
  const start = addDays(asOf, -(days - 1))

  const rows = db
    .prepare('SELECT * FROM timeline WHERE date BETWEEN ? AND ? ORDER BY date')
    .all(start, asOf) as TimelineRow[]
  const cur = rows[rows.length - 1]

  // 7-day change (toward 0 = improving, since higher index = worse)
  const weekAgo = rows.find((r) => r.date >= addDays(asOf, -7)) ?? rows[0]
  const delta = cur.index_value != null && weekAgo.index_value != null
    ? round1(cur.index_value - weekAgo.index_value)
    : null

  // Most recent turning point across the whole episode (for context).
  const tp = db
    .prepare(`SELECT date, turning_point FROM timeline WHERE turning_point IS NOT NULL AND turning_point != '' ORDER BY date DESC LIMIT 1`)
    .get() as { date: string; turning_point: string } | undefined

  // Episode peak (worst) for context.
  const peak = db
    .prepare('SELECT date, index_value FROM timeline ORDER BY index_value DESC LIMIT 1')
    .get() as { date: string; index_value: number }

  const surveys = db
    .prepare('SELECT date, modq_total FROM surveys WHERE date BETWEEN ? AND ? ORDER BY date')
    .all(start, asOf) as { date: string; modq_total: number }[]

  const series = rows
    .map((r) => `${r.date}: index ${r.index_value != null ? round1(r.index_value) : '—'} (band ${r.band_low ?? '—'}–${r.band_high ?? '—'}, ${r.trend ?? '—'})`)
    .join('\n')

  const dir = delta == null ? 'unknown' : delta < -2 ? 'improving' : delta > 2 ? 'worsening' : 'roughly steady'

  const report = [
    `RECOVERY TRAJECTORY — most recent reading ${asOf} (this is the latest computed point; treat it as the current picture)`,
    ``,
    `Current estimated index: ${cur.index_value != null ? round1(cur.index_value) : '—'} on a 0–100 scale (higher = worse), uncertainty band ${cur.band_low ?? '—'}–${cur.band_high ?? '—'}.`,
    `Severity band: roughly "${cur.index_value != null ? bandLabel(cur.index_value) : 'unknown'}". Report this as a band, not a number.`,
    `7-day trend: ${cur.trend ?? '—'} (${dir}${delta != null ? `, Δ${delta > 0 ? '+' : ''}${delta} over the week` : ''}).`,
    tp ? `Most recent turning point: ${tp.turning_point} on ${tp.date}.` : `No turning point flagged recently.`,
    `For context, the episode's worst estimated point was ~${round1(peak.index_value)} on ${peak.date}.`,
    cur.narration ? `\nToday's honest read: ${cur.narration}` : '',
    surveys.length ? `\nGround-truth MODQ surveys in this window:\n${surveys.map((s) => `  ${s.date}: ${s.modq_total}`).join('\n')}` : `\nNo self-reported MODQ surveys in this window — the index is running survey-free here.`,
    `\nIndex series (last ${days} days):\n${series}`,
    `\n— ${HONESTY}`,
  ].filter(Boolean).join('\n')

  return txt(report)
}

// ── tool: get_risk ─────────────────────────────────────────────────────────
function getRisk(days: number) {
  const latest = db.prepare('SELECT MAX(date) AS d FROM timeline').get() as { d: string | null }
  if (!latest?.d) return txt('No timeline computed yet.')
  const asOf = latest.d
  const start = addDays(asOf, -(days - 1))

  const rows = db
    .prepare('SELECT date, risk_score, risk_flags FROM timeline WHERE date BETWEEN ? AND ? ORDER BY date')
    .all(start, asOf) as { date: string; risk_score: number | null; risk_flags: string | null }[]
  const cur = rows[rows.length - 1]

  const flagged = rows.filter((r) => r.risk_flags && r.risk_flags !== '[]')
  const curFlags = cur.risk_flags && cur.risk_flags !== '[]' ? cur.risk_flags : '[]'

  const lines = flagged.length
    ? flagged.map((r) => `  ${r.date}: risk ${r.risk_score ?? 0} ${r.risk_flags}`).join('\n')
    : '  (no leading-signal flags in this window)'

  const report = [
    `FLARE-RISK READ — most recent reading ${asOf}. This is an INSTRUMENTED HYPOTHESIS, not a validated prediction.`,
    ``,
    `Current risk score: ${cur.risk_score ?? 0} (0–1). Active flags today: ${curFlags}.`,
    ``,
    `What the flags mean:`,
    `  • over_exertion — a relative activity spike vs a recovering baseline. This is the ONE phone-only *leading* signal we have (e.g. ~8 Aug 2025 preceded the 12 Aug relapse trigger). Behaviour→risk, not symptom precognition. Suggestive on a single instance.`,
    `  • high_exposure — calendar load (e.g. long-haul travel, packed seated weeks). A plausible *leading* class, but on this one episode the evidence is essentially a single long-haul trip ~3–4 weeks before onset — temporally loose, high confirmation-bias risk.`,
    `  • pressure_swing — a weather covariate (barometric front passage). Weak, exploratory.`,
    ``,
    `Flag history (last ${days} days):`,
    lines,
    ``,
    `IMPORTANT: gait/symptom signals are a *consequence* of pain and CANNOT predict onset — onset in this episode was acute, with no multi-day gait precursor. The model does not predict flare-ups. Frame risk as pacing guidance ("you've been pushing hard — consider easing off"), never as a forecast.`,
    `\n${ESCALATE}`,
    `\n— ${HONESTY}`,
  ].join('\n')

  return txt(report)
}

// ── tool: get_evidence (the proven-vs-not scorecard) ─────────────────────────
function getEvidence() {
  const report = `WHAT WE CAN AND CANNOT CLAIM — the scorecard ships with the product. Honesty is the feature.

Subject: n = 1 (one person, one sciatica episode, May–Oct 2025). Nothing below is clinically validated.

KEY NUMBERS (do not misquote):
  • Index↔MODQ calibration: R² = 0.69 · in-sample MAE 9.1 · leave-one-out MAE 10.5 · implied r ≈ 0.83.
  • Honest forward error: expanding-window forward MAE ≈ 14.9 (LOO was optimistic).
  • Block test (train→18 Aug, predict relapse+recovery cold): direction r = 0.94, MAE 14.0 — nailed the SHAPE, drifted on absolute level.
  • Circularity cleared: gait predicts non-walking items too — pain intensity r = 0.79, sleep r = 0.69.
  • Lead/lag: correlation peaks SAME-DAY (r 0.83) and stays high after → coincident-to-lagging, NOT leading.

SCORECARD:
  Claim                                                              | Status            | Basis
  -------------------------------------------------------------------|-------------------|------------------------------
  Gait (speed+steps) tracks within-episode disability *direction*    | SUPPORTED         | R²=0.69; block-test r=0.94
  Reflects a general severity factor, not just the walking item      | SUPPORTED         | predicts pain r=0.79, sleep 0.69
  Yields an accurate *absolute* MODQ score                           | NOT SUPPORTED     | forward MAE ≈15; biased; lags
  *Predicts/leads* worsening (precognition)                          | NOT SUPPORTED     | coincident-to-lagging (peak r at lag 0)
  Predicts episode *onset*                                           | NOT SUPPORTED     | onset acute; gait is a consequence
  Over-exertion (activity spike) precedes a flare                    | SUGGESTIVE        | one instance (8 Aug); plausible
  Travel/exposure load precedes onset                                | SUGGESTIVE (weak) | one long-haul trip, loose timing
  Generalises across people                                          | UNTESTED          | n=1
  Works in the low/baseline range (MODQ 0–20)                        | UNTESTED          | no labels below 12 in-window
  Specific to sciatica vs any mobility hit                           | UNTESTED          | no discriminant cases

THE EPISODE: ER 27 Jun 2025 (onset) → MODQ trough 82 → partial recovery → relapse late Aug (peak 82) → recovered to 12 by 1 Oct. A non-monotonic recovery — which is what makes it a useful test case.

THE DEFENSIBLE PRODUCT: a personalised, trend-not-point recovery *tracker* with real-time turning-point detection. Onset prediction is a separate, future track needing *leading* signals gait lacks.

— ${HONESTY}`
  return txt(report)
}

// ── tool: run_checkin (record a conversationally-administered MODQ) ───────────
function runCheckin(items: Record<string, number>) {
  const sum = ITEMS.reduce((s, i) => s + (items[i] ?? 0), 0)
  const total = Math.round((sum / 50) * 100)
  const date = new Date().toISOString().slice(0, 10)
  const id = `s-checkin-${Date.now()}`

  db.transaction(() => {
    db.prepare('INSERT OR REPLACE INTO surveys (id,date,modq_total,source) VALUES (?,?,?,?)')
      .run(id, date, total, 'checkin')
    const ins = db.prepare('INSERT OR REPLACE INTO survey_items (survey_id,item,value) VALUES (?,?,?)')
    for (const i of ITEMS) ins.run(id, i, items[i] ?? 0)
  })()

  // Compare to the model's most recent estimate (the index this survey calibrates against).
  const est = db
    .prepare('SELECT date, index_value FROM timeline WHERE index_value IS NOT NULL ORDER BY date DESC LIMIT 1')
    .get() as { date: string; index_value: number } | undefined

  const report = [
    `CHECK-IN RECORDED (${date}).`,
    ``,
    `Scored Modified Oswestry total: ${total}/100 → "${bandLabel(total)}".`,
    `Per-section (0–5): ${ITEMS.map((i) => `${i}=${items[i] ?? 0}`).join(', ')}.`,
    `Saved as ground-truth survey ${id}. This is the validated instrument the passive index is calibrated against — your real answers are what keep the tracking honest.`,
    est ? `\nFor reference, the model's most recent passive estimate was ~${round1(est.index_value)} (as of ${est.date}). Expect them to differ — the index is a direction estimate with ±~15-point honest error, not a precise match.` : '',
    `\n${ESCALATE}`,
    `\n— ${HONESTY}`,
  ].filter(Boolean).join('\n')

  return txt(report)
}

// ── tool: send_telegram (the scheduled daily nudge channel) ───────────────────
const APP_URL = process.env.APP_URL || 'https://throughline-spine.fly.dev'

// Plain Telegram push (reused by the MCP tool and the /api/demo-ping endpoint).
export async function pushTelegram(message: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return { ok: false, error: 'Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID unset)' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
    })
    const j = (await r.json()) as { ok?: boolean; description?: string }
    return j.ok ? { ok: true } : { ok: false, error: j.description ?? 'unknown error' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function sendTelegram(message: string) {
  const r = await pushTelegram(message)
  return txt(r.ok ? 'Reminder sent to Telegram.' : `Telegram send failed: ${r.error}`)
}

// ── server factory ────────────────────────────────────────────────────────────
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'throughline', version: '1.0.0' },
    {
      instructions: `Throughline is a personalised, n=1 sciatica recovery companion built around real passive data (Apple Health gait + activity), a calibrated recovery-trajectory index, a leading-signal flare-risk read, and a conversational Modified Oswestry (MODQ) check-in.

Use these tools to answer questions like "how's my back this week — am I at risk?" honestly:
  • get_trajectory — the recovery-index direction, band, trend, turning points, and today's narration.
  • get_risk — the flare-risk read (over-exertion / exposure / pressure flags). An instrumented hypothesis, not a forecast.
  • get_evidence — the proven-vs-not scorecard and key numbers. Lead with this when asked "how does it know" or to be honest about limits.
  • run_checkin — after conducting the 10-section MODQ as a short, warm conversation (one question at a time, mapped faithfully to each 0–5 scale), call this with the scored items to record the survey.
  • send_telegram — send Jamie a gentle daily reminder on Telegram (read get_trajectory/get_risk first, then compose an honest one-liner). For the scheduled-routine nudge — the interactive MODQ still happens in the app.

After a check-in, it's good to offer a daily rhythm: ask if Jamie would like a Routine in Claude to nudge him each morning via Telegram (send_telegram). Be honest that a scheduled routine sends a reminder + passive read, not an unattended scored survey.

${HONESTY}`,
    },
  )

  server.registerTool(
    'get_trajectory',
    {
      title: 'Get recovery trajectory',
      description: 'Returns the recovery-index direction, uncertainty band, 7-day trend, recent turning points, today\'s narration, and any ground-truth MODQ surveys in the window. The index is a calibrated TREND estimate (±~15 pt honest error), not a precise score — report direction and band, never an exact number.',
      inputSchema: { days: z.number().int().min(7).max(180).optional().describe('How many days back to include (default 30).') },
    },
    async ({ days }) => getTrajectory(days ?? 30),
  )

  server.registerTool(
    'get_risk',
    {
      title: 'Get flare-risk read',
      description: 'Returns the leading-signal flare-risk read: current risk score, active flags (over_exertion / high_exposure / pressure_swing), and flag history. This is an INSTRUMENTED HYPOTHESIS — gait is a consequence of pain and cannot predict onset; the model does not predict flare-ups. Frame as pacing guidance, not a forecast.',
      inputSchema: { days: z.number().int().min(7).max(180).optional().describe('How many days back to include (default 14).') },
    },
    async ({ days }) => getRisk(days ?? 14),
  )

  server.registerTool(
    'get_evidence',
    {
      title: 'Get the proven-vs-not scorecard',
      description: 'Returns the honesty scorecard: what the data does and does not support (n=1), with the key validation numbers (R²=0.69, block-test direction r=0.94, lead/lag coincident-not-leading, etc.). Use when asked how it knows, or to stay honest about limits.',
      inputSchema: {},
    },
    async () => getEvidence(),
  )

  server.registerTool(
    'run_checkin',
    {
      title: 'Record a MODQ check-in',
      description: 'Records a completed Modified Oswestry check-in. First conduct the 10 sections as a short, warm conversation (one question at a time), map each answer faithfully to its validated 0–5 scale (0 = no limitation, 5 = maximal), then call this with all 10 values. Do NOT invent scores. Persists a ground-truth survey and reports the scored total.',
      inputSchema: Object.fromEntries(
        ITEMS.map((i) => [i, z.number().int().min(0).max(5).describe(`${i}: 0 (no limitation) – 5 (maximal limitation)`)]),
      ) as Record<string, z.ZodType>,
    },
    async (args) => runCheckin(args as Record<string, number>),
  )

  server.registerTool(
    'send_telegram',
    {
      title: 'Send a Telegram reminder',
      description: `Sends one short message to Jamie's Telegram — the daily check-in nudge. First call get_trajectory (and get_risk), then compose a GENTLE, HONEST one-liner that respects the rubric: trends not points, no diagnosis, no forecast, no false reassurance. Typically: a one-sentence read of the recovery trend + a warm invitation to check in at ${APP_URL}. Keep it brief and kind. (Use for the scheduled daily reminder; the interactive MODQ still happens in the app, not here.)`,
      inputSchema: { message: z.string().min(1).max(1200).describe('The exact message text to send — you compose it, honestly and gently.') },
    },
    async ({ message }) => sendTelegram(message),
  )

  return server
}

// ── raw Node HTTP handler (stateless Streamable HTTP) ─────────────────────────
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function setCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, mcp-protocol-version, Authorization, Accept')
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version')
}

export async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Stateless: a fresh server + transport per request (no session state to share).
  const server = createMcpServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => {
    transport.close()
    server.close()
  })

  try {
    await server.connect(transport)
    const body = req.method === 'POST' ? await readBody(req) : undefined
    await transport.handleRequest(req, res, body)
  } catch (err) {
    console.error('[mcp] request error', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null }))
    }
  }
}
