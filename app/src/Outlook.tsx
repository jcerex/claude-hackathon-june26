import { useEffect, useRef, useState } from 'react'
import type { TimelineRow } from './api'
import { RecoveryCurve } from './RecoveryCurve'

// Seeded demo scenario — synthetic data for the three sources, written to rhyme
// with Jamie's real episode antecedents (long-haul + sitting before onset; an
// over-exertion spike before the August relapse; recovery trending down).
const SOURCES = [
  { key: 'calendar', glyph: '📅', name: 'Calendar', findings: ['United 412 · SYD→SFO — 14 h, in 9 days', 'Conference week 24–28th — 22 meetings, mostly seated'] },
  { key: 'health', glyph: '❤️', name: 'Apple Health', findings: ['Steps 9,240 Tue — 2.3× your 14-day baseline', 'Walking pace holding steady'] },
  { key: 'whoop', glyph: '⌚', name: 'Whoop', findings: ['HRV 38 ms, down from 52', 'Sleep debt 4.2 h · Recovery 31% (red)'] },
]

const RECS = [
  { glyph: '✈️', lever: 'The flight', text: 'Aisle seat, stand and walk every 45 min, hydrate — and don’t hoist the bag overhead.' },
  { glyph: '🪑', lever: 'Conference days', text: 'Break the long sits: a 2-minute walk between sessions, stand at the back when you can.' },
  { glyph: '🥾', lever: 'Pacing', text: 'Don’t stack a big walk on travel days — let Tuesday’s spike settle first.' },
  { glyph: '😴', lever: 'Sleep', text: 'Protect the two nights before you fly. Right now it’s your strongest lever.' },
]

const band = (t: number) => (t <= 20 ? 'minimal' : t <= 40 ? 'moderate' : t <= 60 ? 'severe' : 'high')

export function Outlook({ tl, survey }: { tl: TimelineRow[]; survey: { modq_total: number } | null }) {
  const [scanned, setScanned] = useState(0)
  const [synth, setSynth] = useState(false)
  const [nudge, setNudge] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const ts = [
      setTimeout(() => setScanned(1), 800),
      setTimeout(() => setScanned(2), 1600),
      setTimeout(() => setScanned(3), 2400),
      setTimeout(() => setSynth(true), 3300),
    ]
    return () => ts.forEach(clearTimeout)
  }, [])

  return (
    <section className="card outlook" ref={ref}>
      <p className="recovery-eyebrow">Building your picture</p>
      <h2 className="recovery-head">
        {synth
          ? <>The next two weeks need <span className="soft">a little care</span>.</>
          : <>Pulling your data together<span className="dots" /></>}
      </h2>

      <div className="sources">
        {SOURCES.map((s, i) => {
          const done = i < scanned
          return (
            <div key={s.key} className={`source-card ${done ? 'done' : 'scanning'}`}>
              <div className="source-top">
                <span className="source-glyph">{s.glyph}</span>
                <span className="source-name">{s.name}</span>
                {done ? <span className="source-check">✓</span> : <span className="source-spin" />}
              </div>
              {done && (
                <ul className="source-findings">
                  {s.findings.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {synth && (
        <div className="synth rise">
          {survey && <div className="today-chip">Today’s check-in · MODQ {survey.modq_total} ({band(survey.modq_total)})</div>}

          <div className="curve-wrap"><RecoveryCurve tl={tl} /></div>

          <div className="risk-card">
            <span className="risk-flag">Elevated-risk window · next ~2 weeks</span>
            <p className="risk-body">
              Three things are lining up the way they did before your past episodes: a <strong>long-haul flight + a sitting-heavy week</strong> (your onset pattern),
              an <strong>over-exertion spike</strong> on Tuesday (your August-relapse pattern), and <strong>recovery trending down</strong>.
            </p>
          </div>

          <div className="recs">
            <p className="recs-head">How to de-load it</p>
            {RECS.map((r) => (
              <div className="rec" key={r.lever}>
                <span className="rec-glyph">{r.glyph}</span>
                <span className="rec-text"><strong>{r.lever}.</strong> {r.text}</span>
              </div>
            ))}
            {nudge
              ? <p className="nudge-done">✓ I’ll nudge you on Telegram each travel day.</p>
              : <button className="btn primary recs-cta" onClick={() => setNudge(true)}>Set Telegram nudges for travel days</button>}
          </div>
        </div>
      )}
    </section>
  )
}
