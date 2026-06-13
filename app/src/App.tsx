import { useEffect, useState } from 'react'
import { getTimeline, getSurveys, getEvents, type TimelineRow, type Survey, type EventRow } from './api'
import { Home } from './Home'
import { Dashboard } from './Dashboard'
import { Evidence } from './Evidence'

type View = 'home' | 'detail' | 'evidence'

export function App() {
  const [tl, setTl] = useState<TimelineRow[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [liveDate, setLiveDate] = useState<string | null>(null)
  const [view, setView] = useState<View>('home')
  const [err, setErr] = useState<string>()

  useEffect(() => {
    Promise.all([getTimeline(), getSurveys(), getEvents()])
      .then(([t, s, e]) => { setTl(t); setSurveys(s); setEvents(e) })
      .catch((x) => setErr(String(x)))
  }, [])

  function onScored(s: { id: string; date: string; modq_total: number }) {
    setSurveys((prev) => [...prev.filter((p) => p.id !== s.id), { ...s, source: 'interview' }])
    setLiveDate(s.date)
  }

  if (err) return <main className="shell"><p className="err">Couldn’t load your data: {err}</p></main>

  return (
    <main className="shell">
      {view === 'home' && (
        <Home tl={tl} onScored={onScored} onNav={(v) => setView(v)} />
      )}

      {view === 'detail' && (
        <div className="rise rise-1">
          <button className="back-link" onClick={() => setView('home')}>← back</button>
          <h1 className="subview-title">The full picture</h1>
          <p className="subview-sub">The passive index, its uncertainty band, leading-signal flags, and the turning points — the clinical view.</p>
          <Dashboard tl={tl} surveys={surveys} events={events} liveDate={liveDate} />
        </div>
      )}

      {view === 'evidence' && (
        <div className="rise rise-1">
          <button className="back-link" onClick={() => setView('home')}>← back</button>
          <h1 className="subview-title">How it knows</h1>
          <p className="subview-sub">What the data does — and doesn’t — support. Honesty is the feature.</p>
          <Evidence />
        </div>
      )}
    </main>
  )
}
