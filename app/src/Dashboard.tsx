import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js'
import type { TimelineRow, Survey, EventRow } from './api'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)
Chart.defaults.font.family = "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif"
Chart.defaults.color = '#797B70'

// calm palette
const SAGE = '#5F7A6A', SAGE_DEEP = '#3E5546', CLAY = '#BE7F61', CLAY_DEEP = '#A8694C', ROSE = '#AE6359'
const GRID = 'rgba(54,58,49,0.07)'

const FORECAST_HORIZON = 7

function addDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function trendWord(t: string | null): string {
  if (t === 'improving') return 'improving'
  if (t === 'worsening') return 'sliding'
  return 'holding steady'
}

export function Dashboard({
  tl, surveys, events, liveDate,
}: {
  tl: TimelineRow[]
  surveys: Survey[]
  events: EventRow[]
  liveDate: string | null
}) {
  if (tl.length === 0) return <section className="card"><p className="sub2">Loading trajectory…</p></section>

  const byDate = new Map(tl.map((r) => [r.date, r]))
  const surveyByDate = new Map(surveys.map((s) => [s.date, s.modq_total]))
  const last = tl[tl.length - 1]

  // Forward forecast cone from the latest reading (naive per-day forecast is damped later).
  const futureLabels = Array.from({ length: FORECAST_HORIZON }, (_, k) => addDays(last.date, k + 1))
  const fc = new Map<string, { line: number; lo: number; hi: number }>()
  fc.set(last.date, { line: last.index_value ?? 0, lo: last.band_low ?? 0, hi: last.band_high ?? 0 })
  for (let k = 0; k < FORECAST_HORIZON; k++) {
    const f = (k + 1) / FORECAST_HORIZON
    fc.set(futureLabels[k], {
      line: (last.index_value ?? 0) + ((last.forecast_value ?? last.index_value ?? 0) - (last.index_value ?? 0)) * f,
      lo: (last.band_low ?? 0) + ((last.forecast_low ?? 0) - (last.band_low ?? 0)) * f,
      hi: (last.band_high ?? 0) + ((last.forecast_high ?? 0) - (last.band_high ?? 0)) * f,
    })
  }

  const labels = Array.from(new Set([...tl.map((r) => r.date), ...futureLabels, ...surveys.map((s) => s.date)])).sort()

  const transitions: { date: string; type: string }[] = []
  let prevTp = ''
  for (const r of tl) {
    const cur = r.turning_point || ''
    if (cur && cur !== prevTp) transitions.push({ date: r.date, type: cur })
    prevTp = cur
  }
  const tpByDate = new Map(transitions.map((t) => [t.date, t.type]))

  const round1 = (n: number) => Math.round(n * 10) / 10
  const nowcastLo = labels.map((d) => byDate.get(d)?.band_low ?? null)
  const nowcastHi = labels.map((d) => byDate.get(d)?.band_high ?? null)
  const indexData = labels.map((d) => byDate.get(d)?.index_value ?? null)
  const fcLo = labels.map((d) => (fc.has(d) ? round1(fc.get(d)!.lo) : null))
  const fcHi = labels.map((d) => (fc.has(d) ? round1(fc.get(d)!.hi) : null))
  const fcLine = labels.map((d) => (fc.has(d) ? round1(fc.get(d)!.line) : null))
  const actual = labels.map((d) => (surveyByDate.has(d) ? surveyByDate.get(d)! : null))
  const live = labels.map((d) => (d === liveDate ? (surveyByDate.get(d) ?? null) : null))

  const tpData = labels.map((d) => (tpByDate.has(d) ? byDate.get(d)?.index_value ?? null : null))
  const tpColor = labels.map((d) => (tpByDate.get(d) === 'past_worst' ? SAGE : tpByDate.get(d) === 'relapse_onset' ? ROSE : 'transparent'))
  const tpRotation = labels.map((d) => (tpByDate.get(d) === 'relapse_onset' ? 180 : 0))
  const tpRadius = labels.map((d) => (tpByDate.has(d) ? 8 : 0))

  const flagged = (d: string) => {
    const f = byDate.get(d)?.risk_flags
    return !!f && f !== '[]'
  }
  const riskData = labels.map((d) => (flagged(d) ? 97 : null))
  const riskColor = labels.map((d) => (flagged(d) ? ((byDate.get(d)?.risk_score ?? 0) >= 0.7 ? ROSE : CLAY) : 'transparent'))
  const riskRadius = labels.map((d) => (flagged(d) ? 3.5 : 0))

  const lastTransition = transitions[transitions.length - 1]

  return (
    <>
      <section className="card narration-card">
        <div className="narr-row">
          <span className={`trend-chip ${last.trend ?? ''}`}>{trendWord(last.trend)}</span>
          <span className="as-of">as of {last.date}</span>
        </div>
        <p className="narration">{last.narration || 'No narration for the latest day.'}</p>
        {lastTransition && (
          <p className="turning-note">
            Most recent turning point: <strong>{lastTransition.type === 'past_worst' ? 'past the worst' : 'relapse onset'}</strong> ({lastTransition.date}).
          </p>
        )}
      </section>

      <section className="card">
        <div className="chart">
          <Line
            data={{
              labels,
              datasets: [
                { label: '_ncl', data: nowcastLo, borderColor: 'transparent', pointRadius: 0, fill: false, tension: 0.25 },
                { label: 'Nowcast band', data: nowcastHi, borderColor: 'transparent', backgroundColor: 'rgba(95,122,106,0.15)', pointRadius: 0, fill: '-1', tension: 0.25 },
                { label: '_fcl', data: fcLo, borderColor: 'transparent', pointRadius: 0, fill: false, tension: 0.25 },
                { label: 'Forecast band', data: fcHi, borderColor: 'transparent', backgroundColor: 'rgba(190,127,97,0.16)', pointRadius: 0, fill: '-1', tension: 0.25 },
                { label: 'Forecast (naive)', data: fcLine, borderColor: CLAY, borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false, tension: 0.2 },
                { label: 'Recovery index (speed + steps)', data: indexData, borderColor: SAGE, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.25 },
                { label: 'MODQ survey (actual)', data: actual, borderColor: CLAY_DEEP, backgroundColor: CLAY_DEEP, borderWidth: 1.5, borderDash: [6, 4], pointRadius: 4, spanGaps: true, tension: 0.25 },
                { label: 'Latest check-in', data: live, borderColor: SAGE_DEEP, backgroundColor: SAGE_DEEP, borderWidth: 0, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'rectRot', showLine: false },
                { label: 'Turning point', data: tpData, backgroundColor: tpColor, borderColor: tpColor, pointRadius: tpRadius, pointHoverRadius: 9, pointStyle: 'triangle', pointRotation: tpRotation, showLine: false },
                { label: 'Risk flag (over-exertion / exposure)', data: riskData, backgroundColor: riskColor, borderColor: riskColor, pointRadius: riskRadius, pointStyle: 'circle', showLine: false },
              ],
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              scales: {
                y: { min: 0, max: 100, grid: { color: GRID }, title: { display: true, text: 'disability (0–100, higher = worse)', color: '#797B70' } },
                x: { grid: { color: GRID }, ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 } },
              },
              plugins: {
                legend: { labels: { boxWidth: 12, usePointStyle: true, color: '#4C5046', filter: (item) => !item.text?.startsWith('_') } },
                tooltip: {
                  filter: (item) => !item.dataset.label?.startsWith('_'),
                  callbacks: {
                    afterBody: (items) => {
                      const d = items[0]?.label
                      const r = d ? byDate.get(d) : undefined
                      if (!r) return ''
                      const bits: string[] = []
                      if (r.risk_flags && r.risk_flags !== '[]') bits.push(`flags: ${r.risk_flags}`)
                      if (r.turning_point) bits.push(`turning point: ${r.turning_point}`)
                      return bits.join('\n')
                    },
                  },
                },
              },
            }}
          />
        </div>
        <p className="legend-note">
          Sage = passive recovery index with its <em>nowcast</em> uncertainty band · clay dashed = short forward forecast (naive — damped later) ·
          ▲ sage = past the worst, ▼ rose = relapse onset · dots up top = leading-signal risk flags · clay = real MODQ surveys.
        </p>
      </section>

      <p className="note">
        Trends, not points — the index is a calibrated <em>direction</em> estimate (R²=0.69), not a precise score.
        {' '}{events.length} clinical / exposure events anchor the timeline.
      </p>
    </>
  )
}
