export type TimelineRow = {
  date: string
  index_value: number | null
  band_low: number | null
  band_high: number | null
  forecast_value: number | null
  forecast_low: number | null
  forecast_high: number | null
  trend: string | null
  turning_point: string | null
  risk_score: number | null
  risk_flags: string | null
  narration: string | null
  narration_pass: number | null
  narration_score: number | null
}
export type Survey = { id: string; date: string; modq_total: number; source: string }
export type EventRow = { id: string; date: string; title: string; kind: string }

const json = async <T>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json() as Promise<T>
}

export const getTimeline = () => json<TimelineRow[]>('/api/timeline')
export const getSurveys = () => json<Survey[]>('/api/surveys')
export const getEvents = () => json<EventRow[]>('/api/events')

// ── interviewer (conversational MODQ) ──────────────────────────────────────
// The client maintains the full message array: each assistant turn stores the
// `assistant` content blocks the server returned (sent back verbatim next turn),
// each user turn is a plain string.
export type InterviewMessage = { role: 'user' | 'assistant'; content: unknown }

export type InterviewResponse =
  | { done: false; message: string; assistant: unknown }
  | { done: true; survey: { id: string; date: string; modq_total: number }; items: Record<string, number> }

export const postInterview = (messages: InterviewMessage[]): Promise<InterviewResponse> =>
  fetch('/api/interview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error((data as { error?: string })?.error || `interview → ${r.status}`)
    return data as InterviewResponse
  })
