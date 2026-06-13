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
    u.rate = 1.0
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
        const line = `Thank you. That's a Modified Oswestry score of ${resp.survey.modq_total} out of 100 — ${band(resp.survey.modq_total)}. I've noted it on your trajectory.`
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
    <>
      <div className="checkin-head">
        <div>
          <h2>Today&rsquo;s check&#8209;in</h2>
          {phase === 'idle' && <p className="sub2">A few short questions about how your back is — I&rsquo;ll note where things are, gently.</p>}
        </div>
        {ttsSupported && (
          <label className="voice-toggle" title="Read the questions aloud">
            <input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} />
            🔊 voice
          </label>
        )}
      </div>

      {phase === 'idle' ? (
        <div className="begin-wrap">
          <div className="begin">
            <span className="begin-halo" aria-hidden="true" />
            <button className="begin-btn" onClick={start}>Begin check-in</button>
          </div>
          <p className="begin-hint">Speak or type — whatever&rsquo;s easiest right now.</p>
        </div>
      ) : (
        <>
          <div className="chatlog" ref={logRef}>
            {transcript.map((b, i) => (
              <div key={i} className={`bubble ${b.role}`}>
                <span className="who">{b.role === 'assistant' ? 'Claude Opus 4.8' : 'You'}</span>
                <p>{b.text}</p>
              </div>
            ))}
            {busy && <div className="bubble assistant pending"><span className="who">Claude Opus 4.8</span><p className="dots">thinking</p></div>}
            {error && <p className="err">⚠ {error}{error.includes('ANTHROPIC_API_KEY') ? ' — set it in app/.env and restart.' : ''}</p>}
          </div>

          {result && (
            <div className="score-banner">
              <div className="score-num">{result.modq_total}<span>/100</span></div>
              <div className="score-meta">
                <strong>{band(result.modq_total)}</strong>
                <span>noted {result.date} · a trend, not a verdict</span>
              </div>
            </div>
          )}

          <div className="composer">
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
                  <button className={`btn mic ${listening ? 'on' : ''}`} onClick={toggleListen} disabled={busy} title="Answer by voice">🎙</button>
                )}
                <button className="btn primary" onClick={() => send(input)} disabled={busy || !input.trim()}>Send</button>
              </>
            )}
            {(phase === 'done' || phase === 'error') && (
              <button className="btn" onClick={start}>New check-in</button>
            )}
          </div>
        </>
      )}
    </>
  )
}
