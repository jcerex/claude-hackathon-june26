import type { TimelineRow } from './api'
import { CheckIn } from './CheckIn'

// ── recovery curve (bespoke SVG) ──────────────────────────────────────
// Plots recovery = 100 − disability index, so the line RISES toward wellness —
// honest (just 1 − index) and emotionally the right frame for someone in pain.
const W = 760, H = 240, PADX = 8, PADT = 26, PADB = 20

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function RecoveryCurve({ tl }: { tl: TimelineRow[] }) {
  const series = tl.map((r) => r.index_value).filter((v): v is number => v != null)
  if (series.length < 2) return null

  const stride = Math.max(1, Math.ceil(series.length / 56))
  const rec: number[] = []
  for (let i = 0; i < series.length; i += stride) rec.push(100 - series[i])
  if ((series.length - 1) % stride !== 0) rec.push(100 - series[series.length - 1])

  const n = rec.length
  const x = (i: number) => PADX + (i / (n - 1)) * (W - PADX * 2)
  const y = (v: number) => PADT + (1 - v / 100) * (H - PADT - PADB)
  const pts = rec.map((v, i) => ({ x: x(i), y: y(v) }))

  const line = smoothPath(pts)
  const area = `${line} L ${pts[n - 1].x.toFixed(1)} ${H - PADB} L ${pts[0].x.toFixed(1)} ${H - PADB} Z`

  // trough = lowest recovery = the worst of the flare
  let tIdx = 0
  for (let i = 1; i < n; i++) if (rec[i] < rec[tIdx]) tIdx = i
  const trough = pts[tIdx]
  const now = pts[n - 1]

  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Recovery trajectory, rising toward wellness">
      <defs>
        <linearGradient id="recFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5F7A6A" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#5F7A6A" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#recFill)" />
      <path className="curve-line curve-draw" d={line} />

      {/* the worst of it */}
      <circle className="worst-dot" cx={trough.x} cy={trough.y} r="4" />
      <text className="curve-label" x={Math.min(Math.max(trough.x, 60), W - 60)} y={trough.y + 22} textAnchor="middle">the worst of it</text>

      {/* now */}
      <circle className="now-halo" cx={now.x} cy={now.y} r="9" />
      <circle className="now-dot" cx={now.x} cy={now.y} r="5" />
      <text className="curve-label" x={now.x} y={now.y - 14} textAnchor="end">now</text>
    </svg>
  )
}

// ── honest, gentle headline derived from the data ─────────────────────
function bandLabel(idx: number): string {
  if (idx <= 20) return 'minimal range'
  if (idx <= 40) return 'moderate range'
  if (idx <= 60) return 'severe range'
  return 'high range'
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function Home({
  tl, onScored, onNav,
}: {
  tl: TimelineRow[]
  onScored: (s: { id: string; date: string; modq_total: number }) => void
  onNav: (v: 'detail' | 'evidence') => void
}) {
  const part = greetingFor(new Date().getHours())

  // progress framing
  const idxs = tl.map((r) => r.index_value).filter((v): v is number => v != null)
  const last = tl[tl.length - 1]
  const cur = idxs.length ? idxs[idxs.length - 1] : null
  const worst = idxs.length ? Math.max(...idxs) : 0
  const recoveredFrac = worst > 0 && cur != null ? (worst - cur) / worst : 0
  const trend = last?.trend ?? 'plateau'
  const trendPhrase = trend === 'improving' ? 'still easing' : trend === 'worsening' ? 'a little harder' : 'holding steady'

  let head: JSX.Element
  let sub: string
  if (recoveredFrac >= 0.5 && trend !== 'worsening') {
    head = <>You&rsquo;ve come <span className="soft">a long way</span>.</>
    sub = `From the worst of it, you're in a much gentler place — and ${trendPhrase} this week.`
  } else if (trend === 'improving') {
    head = <>You&rsquo;re <span className="soft">heading the right way</span>.</>
    sub = 'Still climbing back. Gently does it.'
  } else if (trend === 'worsening') {
    head = <>This week has been <span className="soft">harder</span>.</>
    sub = "Be gentle with yourself. If it keeps worsening over days, it's worth a word with your clinician."
  } else {
    head = <>You&rsquo;re <span className="soft">holding steady</span>.</>
    sub = 'Roughly level this past week — no bad news in the trend.'
  }

  return (
    <>
      <div className="mast rise rise-1">
        <span className="mark">Throughline</span>
        <span className="tag">your spine, gently tracked</span>
      </div>

      <h1 className="greeting rise rise-1">Good {part}, <span className="soft">Jamie</span>.</h1>
      <p className="greeting-sub rise rise-1">When you&rsquo;re ready, let&rsquo;s check in on how your back is today. It takes about a minute.</p>

      <section className="card checkin rise rise-2">
        <CheckIn onScored={onScored} />
      </section>

      <section className="card recovery rise rise-3">
        <p className="recovery-eyebrow">Your recovery</p>
        <h2 className="recovery-head">{head}</h2>
        <p className="recovery-sub">{sub}</p>

        <div className="curve-wrap">
          <RecoveryCurve tl={tl} />
        </div>

        <div className="recovery-foot">
          {cur != null && (
            <p className="band-line">
              Roughly the <strong>{bandLabel(cur)}</strong> right now — a trend, not a number.
            </p>
          )}
        </div>

        <p className="care-note">
          Throughline tracks trends, not a diagnosis. If your pain sharply worsens, or you notice new numbness,
          weakness, or any change in bladder or bowel control, please contact a clinician.
        </p>
      </section>

      <nav className="quiet-nav rise rise-3">
        <button className="quiet-link" onClick={() => onNav('detail')}>See the full picture</button>
        <button className="quiet-link" onClick={() => onNav('evidence')}>How it knows</button>
      </nav>
    </>
  )
}
