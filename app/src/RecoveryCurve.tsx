import type { TimelineRow } from './api'

// Bespoke recovery curve: plots recovery = 100 − disability index, so the line
// RISES toward wellness — honest (just 1 − index) and the right frame for someone in pain.
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

export function RecoveryCurve({ tl }: { tl: TimelineRow[] }) {
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
      <circle className="worst-dot" cx={trough.x} cy={trough.y} r="4" />
      <text className="curve-label" x={Math.min(Math.max(trough.x, 60), W - 60)} y={trough.y + 22} textAnchor="middle">the worst of it</text>
      <circle className="now-halo" cx={now.x} cy={now.y} r="9" />
      <circle className="now-dot" cx={now.x} cy={now.y} r="5" />
      <text className="curve-label" x={now.x} y={now.y - 14} textAnchor="end">now</text>
    </svg>
  )
}
