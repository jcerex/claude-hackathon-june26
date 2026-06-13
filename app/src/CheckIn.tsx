import { useEffect, useRef, useState } from 'react'
import { postInterview, type InterviewMessage } from './api'

const KICKOFF = "Hi, I'd like to do the check-in."

type Bubble = { role: 'user' | 'assistant'; text: string }
type Phase = 'idle' | 'thinking' | 'asking' | 'done' | 'error'
type ScoredSurvey = { id: string; date: string; modq_total: number }

function band(t: number): string {
  if (t <= 20) return 'minimal disability'
  if (t <= 40) return 'moderate disability'
  if (t <= 60) return 'severe disability'
  if (t <= 80) return 'crippling'
  return 'bed-bound range'
}

// Web Speech API is unprefixed in some browsers, webkit-prefixed in Chrome/Safari.
const SpeechRecognitionImpl: (new () => any) | undefined =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined

export function CheckIn({ onScored }: { onScored: (s: ScoredSurvey) => void }) {
  const [transcript, setTranscript] = useState<Bubble[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ScoredSurvey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiceOut, setVoiceOut] = useState(false)
  const [listening, setListening] = useState(false)

  // The full message array sent to the server (assistant turns hold the content
  // blocks the server returned). Kept in a ref to avoid stale closures mid-turn.
  const messagesRef = useRef<InterviewMessage[]>([])
  const recogRef = useRef<any>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const sttSupported = !!SpeechRecognitionImpl
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript, phase])

  function speak(text: string) {
    if (!voiceOut || !ttsSupported) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    window.speechSynthesis.speak(u)
  }

  async function run(messages: InterviewMessage[]) {
    setPhase('thinking')
    setError(null)
    try {
      const resp = await postInterview(messages)
      if (resp.done) {
        messagesRef.current = messages
        setResult(resp.survey)
        setPhase('done')
        const line = `All done — your Modified Oswestry score is ${resp.survey.modq_total} out of 100 (${band(resp.survey.modq_total)}). I've added it to your trajectory.`
        setTranscript((t) => [...t, { role: 'assistant', text: line }])
        onScored(resp.survey)
        speak(line)
      } else {
        messagesRef.current = [...messages, { role: 'assistant', content: resp.assistant }]
        setTranscript((t) => [...t, { role: 'assistant', text: resp.message }])
        setPhase('asking')
        speak(resp.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  function start() {
    const kickoff: InterviewMessage[] = [{ role: 'user', content: KICKOFF }]
    messagesRef.current = kickoff
    setTranscript([])
    setResult(null)
    void run(kickoff)
  }

  function send(text: string) {
    const clean = text.trim()
    if (!clean || phase === 'thinking') return
    const next: InterviewMessage[] = [...messagesRef.current, { role: 'user', content: clean }]
    messagesRef.current = next
    setTranscript((t) => [...t, { role: 'user', text: clean }])
    setInput('')
    void run(next)
  }

  function toggleListen() {
    if (!SpeechRecognitionImpl) return
    if (listening) {
      recogRef.current?.stop()
      return
    }
    const r = new SpeechRecognitionImpl()
    r.lang = 'en-US'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (ev: any) => {
      const text = ev.results?.[0]?.[0]?.transcript ?? ''
      if (text) send(text)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recogRef.current = r
    setListening(true)
    r.start()
  }

  const busy = phase === 'thinking'
  const active = phase === 'asking' || phase === 'thinking'

  return (
    <section className="card checkin">
      <div className="checkin-head">
        <div>
          <h2>Check in with Claude</h2>
          <p className="sub2">Opus runs the Modified Oswestry as a short conversation, scores it, and drops the point on your trajectory.</p>
        </div>
        {ttsSupported && (
          <label className="voice-toggle" title="Read Claude's questions aloud">
            <input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} />
            🔊 voice
          </label>
        )}
      </div>

      <div className="chatlog" ref={logRef}>
        {transcript.length === 0 && phase === 'idle' && (
          <p className="placeholder">Press <strong>Start check-in</strong>. Answer in your own words — by text, or by voice with the 🎙 button. Ten quick reads on how your back's affecting everyday things.</p>
        )}
        {transcript.map((b, i) => (
          <div key={i} className={`bubble ${b.role}`}>
            <span className="who">{b.role === 'assistant' ? 'Claude' : 'You'}</span>
            <p>{b.text}</p>
          </div>
        ))}
        {busy && <div className="bubble assistant pending"><span className="who">Claude</span><p className="dots">thinking…</p></div>}
        {error && <p className="err">⚠ {error}{error.includes('ANTHROPIC_API_KEY') ? ' — set it in app/.env and restart.' : ''}</p>}
      </div>

      {result && (
        <div className="score-banner">
          <div className="score-num">{result.modq_total}<span>/100</span></div>
          <div className="score-meta">
            <strong>{band(result.modq_total)}</strong>
            <span>MODQ recorded {result.date} · added to the chart ↑</span>
          </div>
        </div>
      )}

      <div className="composer">
        {phase === 'idle' && (
          <button className="btn primary" onClick={start}>Start check-in</button>
        )}
        {active && (
          <>
            <input
              className="answer"
              value={input}
              placeholder={listening ? 'Listening…' : 'Type your answer…'}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(input) }}
              disabled={busy}
              autoFocus
            />
            {sttSupported && (
              <button
                className={`btn mic ${listening ? 'on' : ''}`}
                onClick={toggleListen}
                disabled={busy}
                title="Answer by voice"
              >🎙</button>
            )}
            <button className="btn primary" onClick={() => send(input)} disabled={busy || !input.trim()}>Send</button>
          </>
        )}
        {(phase === 'done' || phase === 'error') && (
          <button className="btn" onClick={start}>New check-in</button>
        )}
      </div>
    </section>
  )
}
