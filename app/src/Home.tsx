import { useState } from 'react'
import type { TimelineRow } from './api'
import { pingDemo } from './api'
import { CheckIn } from './CheckIn'
import { RecoveryCurve } from './RecoveryCurve'
import { Outlook } from './Outlook'

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
  const [scored, setScored] = useState<{ id: string; date: string; modq_total: number } | null>(null)
  const [demo, setDemo] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function startDemo() {
    if (demo === 'sending') return
    setDemo('sending')
    const ok = await pingDemo()
    setDemo(ok ? 'sent' : 'idle')
    if (ok) setTimeout(() => setDemo('idle'), 6000)
  }

  function handleScored(s: { id: string; date: string; modq_total: number }) {
    onScored(s)
    setScored(s)
  }

  // progress framing (the pre-check-in recovery preview)
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
        <button className="demo-btn" onClick={startDemo} title="Send a check-in nudge to Telegram">
          {demo === 'sent' ? 'sent · check Telegram' : demo === 'sending' ? 'sending…' : '▶ start demo'}
        </button>
      </div>

      <h1 className="greeting rise rise-1">Good {part}, <span className="soft">Jamie</span>.</h1>
      <p className="greeting-sub rise rise-1">When you&rsquo;re ready, let&rsquo;s check in on how your back is today. It takes about a minute.</p>

      <section className="card checkin rise rise-2">
        <CheckIn onScored={handleScored} />
      </section>

      {scored ? (
        <Outlook tl={tl} survey={scored} />
      ) : (
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
      )}

      <nav className="quiet-nav rise rise-3">
        <button className="quiet-link" onClick={() => onNav('detail')}>See the full picture</button>
        <button className="quiet-link" onClick={() => onNav('evidence')}>How it knows</button>
      </nav>
    </>
  )
}
