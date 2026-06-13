export const meta = {
  name: 'throughline-validation-brain',
  description: 'Agentic validation + honest daily narration for the recovery index: review the calibration/validation stats and write the proven-vs-not verdict, narrate each day, and grade every output against the YMYL honesty rubric.',
  whenToUse: 'Build Day: run over the calibrated timeline (pass stats + days via args) to produce the self-audited verdict and the per-day narration that fills timeline.narration. "done" = every output passes the honesty rubric.',
  phases: [
    { title: 'Validate', detail: 'review calibration + adversarial-validation stats; write the honest proven-vs-not verdict' },
    { title: 'Narrate', detail: 'per-day honest, counter-catastrophizing read of the trajectory' },
    { title: 'Grade', detail: 'grade every output against the YMYL honesty rubric' },
  ],
}

// Inputs via args (Workflow scripts have no filesystem access):
//   args.stats — the calibration/validation numbers (from calibrate.py / analysis.py / leadlag.py)
//   args.days  — [{date, index, trend, turning_point, risk_flags}] to narrate
const opts = (typeof args === 'object' && args) || {}
const condition = opts.condition || 'sciatica'
const stats = opts.stats || {
  r2: 0.69, mae: 9.1, loo_mae: 10.5, forward_mae: 14.9, block_r: 0.94, n: 14,
  circularity: 'gait predicts self-reported pain (r=0.79) and sleep (r=0.69), not just walking — common-cause, not tautology',
  leadlag: 'coincident-to-lagging (lag-0 correlation peaks); does NOT lead, cannot predict onset',
}
const days = Array.isArray(opts.days) ? opts.days : []

const HONESTY_GATES = `
1. TRENDS NOT POINTS — direction/bands, never a precise clinical score.
2. NO DIAGNOSIS — never state what condition the person has.
3. NO PROGNOSIS PRECISION — no confident dates; ranges + low confidence only.
4. NO CAUSAL CLAIMS from observational data ("associated with", not "caused by").
5. EARLY-WARNING IS UNPROVEN — never present flare prediction as established fact.
6. COUNTER-CATASTROPHIZE HONESTLY — reassure with the trend, no false promises.
7. ESCALATE — sustained worsening / red-flag wording → suggest contacting a clinician.
`.trim()

const VERDICT_SCHEMA = {
  type: 'object', required: ['headline', 'proven', 'not_proven'],
  properties: {
    headline: { type: 'string' },
    proven: { type: 'array', items: { type: 'string' } },
    not_proven: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
  },
}
const NARRATION_SCHEMA = {
  type: 'object', required: ['date', 'narration', 'confidence'],
  properties: {
    date: { type: 'string' },
    narration: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'moderate'] },
  },
}
const JUDGE_SCHEMA = {
  type: 'object', required: ['pass', 'score', 'violations'],
  properties: {
    pass: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    violations: { type: 'array', items: { type: 'string' } },
  },
}

// Phase 1 — Validate: write the honest verdict from the computed stats, then grade it.
phase('Validate')
const verdict = await agent(
  `You are the skeptical reviewer of a passive ${condition} recovery index. From these computed statistics, write an honest "what's proven vs not" verdict for the methodology doc. Be scientist AND skeptic — do not oversell; surface every real limitation.\n\nSTATS:\n${JSON.stringify(stats, null, 2)}`,
  { label: 'verdict', phase: 'Validate', schema: VERDICT_SCHEMA },
)
const verdictGrade = await agent(
  `Grade this verdict against the honesty gates. Fail if it overclaims (especially onset prediction or precise scores) or omits the key limitations.\n\nGATES:\n${HONESTY_GATES}\n\nVERDICT:\n${JSON.stringify(verdict)}`,
  { label: 'grade:verdict', phase: 'Grade', schema: JUDGE_SCHEMA },
)

// Phases 2+3 — narrate each day and grade it. pipeline(): no barrier — each day
// flows narrate -> grade independently.
const narrated = await pipeline(
  days,
  (d) => agent(
    `Write one honest, counter-catastrophizing daily read for a ${condition} recovery tracker. Trends not points; no diagnosis; no precise prognosis; early-warning is unproven. 2–3 sentences.\n\nDAY: ${JSON.stringify(d)}`,
    { label: `narrate:${d.date}`, phase: 'Narrate', schema: NARRATION_SCHEMA },
  ),
  (n) => agent(
    `Grade this narration against the honesty gates; fail on any violation.\n\nGATES:\n${HONESTY_GATES}\n\nNARRATION:\n${JSON.stringify(n)}`,
    { label: `grade:${n && n.date}`, phase: 'Grade', schema: JUDGE_SCHEMA },
  ).then((v) => ({ ...n, pass: !!(v && v.pass), score: (v && v.score) || 0, violations: (v && v.violations) || [] })),
)

const clean = narrated.filter(Boolean)
const done = !!(verdictGrade && verdictGrade.pass) && clean.every((n) => n.pass)
log(`verdict ${verdictGrade && verdictGrade.pass ? 'PASS' : 'FAIL'} · narrations ${clean.filter((n) => n.pass).length}/${clean.length} pass · done=${done}`)

return { condition, verdict, verdictGrade, narrations: clean, done }
