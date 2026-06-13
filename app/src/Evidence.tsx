// The proven-vs-not scorecard — the honesty flex, made visible.
// Content mirrors docs/methodology-evidence.md §8 and the MCP get_evidence tool.

type Status = 'supported' | 'not-supported' | 'suggestive' | 'untested'

const STATUS_LABEL: Record<Status, string> = {
  'supported': 'Supported',
  'not-supported': 'Not supported',
  'suggestive': 'Suggestive',
  'untested': 'Untested',
}

const SCORECARD: { claim: string; status: Status; basis: string }[] = [
  { claim: 'Gait (speed + steps) tracks within-episode disability direction', status: 'supported', basis: 'R²=0.69; block-test direction r=0.94' },
  { claim: 'Reflects a general severity factor, not just the walking item', status: 'supported', basis: 'predicts pain r=0.79, sleep r=0.69' },
  { claim: 'Yields an accurate absolute MODQ score', status: 'not-supported', basis: 'forward MAE ≈15; biased; lags' },
  { claim: 'Predicts / leads worsening (precognition)', status: 'not-supported', basis: 'coincident-to-lagging (peak r at lag 0)' },
  { claim: 'Predicts episode onset', status: 'not-supported', basis: 'onset acute; gait is a consequence' },
  { claim: 'Over-exertion (activity spike) precedes a flare', status: 'suggestive', basis: 'one instance (8 Aug); plausible mechanism' },
  { claim: 'Travel / exposure load precedes onset', status: 'suggestive', basis: 'one long-haul trip, loose timing' },
  { claim: 'Generalises across people', status: 'untested', basis: 'n = 1' },
  { claim: 'Works in the low / baseline range (MODQ 0–20)', status: 'untested', basis: 'no labels below 12 in-window' },
  { claim: 'Specific to sciatica vs any mobility hit', status: 'untested', basis: 'no discriminant cases' },
]

const NUMBERS: { v: string; k: string }[] = [
  { v: '0.69', k: 'R² — index↔MODQ calibration (n=14)' },
  { v: '10.5', k: 'leave-one-out MAE (MODQ points)' },
  { v: '14.9', k: 'honest forward MAE (LOO was optimistic)' },
  { v: '0.94', k: 'block-test direction r — caught the relapse cold' },
  { v: 'lag 0', k: 'lead/lag peak → coincident, not leading' },
]

export function Evidence() {
  return (
    <>
      <section className="card evidence">
        <h2>What this can — and can't — claim</h2>
        <p className="sub2">
          The empirical basis, stated honestly. <strong>n = 1</strong> — one person, one sciatica episode (May–Oct 2025).
          Nothing here is clinically validated or proven to generalise. Honesty is the feature, not a disclaimer.
        </p>

        <div className="numgrid">
          {NUMBERS.map((n) => (
            <div className="numcard" key={n.k}>
              <div className="numval">{n.v}</div>
              <div className="numkey">{n.k}</div>
            </div>
          ))}
        </div>

        <table className="scorecard">
          <thead>
            <tr><th>Claim</th><th>Status</th><th>Basis</th></tr>
          </thead>
          <tbody>
            {SCORECARD.map((r) => (
              <tr key={r.claim}>
                <td>{r.claim}</td>
                <td><span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td className="basis">{r.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card evidence-foot">
        <h3>The episode it was tested on</h3>
        <p>
          ER 27 Jun 2025 (onset) → MODQ trough 82 → partial recovery → relapse late Aug (peak 82) → recovered to 12 by 1 Oct.
          A <em>non-monotonic</em> recovery — which is exactly what makes it a fair test.
        </p>
        <h3>The defensible product</h3>
        <p>
          A personalised, <strong>trend-not-point</strong> recovery tracker with real-time turning-point detection
          (the green rows above). Onset prediction is a separate, future track that needs <em>leading</em> signals gait
          simply doesn't carry (the amber and grey rows) — built and instrumented toward, never claimed.
        </p>
      </section>
    </>
  )
}
