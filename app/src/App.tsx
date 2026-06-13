import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js'
import { getTimeline, getSurveys, getEvents, type TimelineRow, type Survey, type EventRow } from './api'
import { CheckIn } from './CheckIn'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

export function App() {
  const [tl, setTl] = useState<TimelineRow[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [liveDate, setLiveDate] = useState<string | null>(null)
  const [err, setErr] = useState<string>()

  useEffect(() => {
    Promise.all([getTimeline(), getSurveys(), getEvents()])
      .then(([t, s, e]) => { setTl(t); setSurveys(s); setEvents(e) })
      .catch((x) => setErr(String(x)))
  }, [])

  if (err) return <main className="wrap"><p className="err">Failed to load: {err}</p></main>

  // x-axis = union of timeline days and survey dates, so a fresh check-in
  // (dated today, after the computed timeline) lands as a new point on the right.
  const indexByDate = new Map(tl.map((r) => [r.date, r.index_value]))
  const surveyByDate = new Map(surveys.map((s) => [s.date, s.modq_total]))
  const labels = Array.from(new Set([...tl.map((r) => r.date), ...surveys.map((s) => s.date)])).sort()
  const indexData = labels.map((d) => (indexByDate.has(d) ? indexByDate.get(d)! : null))
  const actual = labels.map((d) => (surveyByDate.has(d) ? surveyByDate.get(d)! : null))
  const live = labels.map((d) => (d === liveDate ? (surveyByDate.get(d) ?? null) : null))

  function onScored(s: { id: string; date: string; modq_total: number }) {
    setSurveys((prev) => [...prev.filter((p) => p.id !== s.id), { ...s, source: 'interview' }])
    setLiveDate(s.date)
  }

  return (
    <main className="wrap">
      <header>
        <h1>Throughline</h1>
        <p className="sub">
          Passive recovery-trajectory tracker · {tl.length} days · {surveys.length} MODQ check-ins · {events.length} events
        </p>
      </header>

      <section className="card">
        <div className="chart">
          {tl.length > 0 && (
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Recovery index (passive: speed + steps)',
                    data: indexData,
                    borderColor: '#378ADD',
                    backgroundColor: 'rgba(55,138,221,0.08)',
                    borderWidth: 2, pointRadius: 0, tension: 0.25, fill: true, spanGaps: false,
                  },
                  {
                    label: 'MODQ survey (actual)',
                    data: actual,
                    borderColor: '#D85A30', backgroundColor: '#D85A30',
                    borderWidth: 1.5, borderDash: [6, 4], pointRadius: 4, spanGaps: true, tension: 0.25,
                  },
                  {
                    label: 'Latest check-in',
                    data: live,
                    borderColor: '#2FBF71', backgroundColor: '#2FBF71',
                    borderWidth: 0, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'rectRot', showLine: false,
                  },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                  y: { min: 0, max: 100, title: { display: true, text: 'disability (0–100, higher = worse)' } },
                  x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 } },
                },
                plugins: { legend: { labels: { boxWidth: 12, usePointStyle: true } } },
              }}
            />
          )}
        </div>
      </section>

      <CheckIn onScored={onScored} />

      <p className="note">
        Trends, not points — the index is a calibrated <em>direction</em> estimate (R²=0.69), not a precise score.
        A live check-in administers the validated MODQ and re-anchors the tracker.
      </p>
    </main>
  )
}
