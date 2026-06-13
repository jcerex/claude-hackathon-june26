# Throughline — Build Plan

## Architecture
```
Apple Health export.xml (+ optional Whoop/Oura csv)
        │
        ▼
[1] Ingest & normalize   → daily signal table (plain JS; deterministic)
        │
        ▼
[2] Personal baselines   → each signal vs *your* normal (JS: rolling median / z-score)
        │
        ▼
[3] Estimate index       → gait quality + walking volume + pain tap → 0–100 composite
        │                   calibrated to the real MODQ *total* score, not per-item;
        │                    plain JS does the arithmetic — anti-hallucination)
        ▼
[4] Narrate              → Opus: "why it moved" + honest trend read (trends-not-points)
        │
        ▼
[5] Judge / eval         → estimate vs REAL ODI on held-out days + safety rubric
        │
        ▼
[6] UI                   → trend chart + narration + signal breakdown + one-tap pain
```

**Division of labour (the key design choice):** the model never invents numbers. Plain JS computes every count, baseline, and the composite index from the raw signals. Opus 4.8 does the *judgement* — how to weight the gait and volume signals into a single severity estimate, how to calibrate that to your real MODQ total on labelled days, and how to explain a move in honest plain language. Same anti-hallucination principle as the archived Tributary workflow.

## The model-verifiable "done" (orchestration)
You have real ground truth: the actual ODI taken on N days. That makes "done" gradeable with no human in the loop.

**Accuracy gate** — against the MODQ *total* score, not per-item (the data only supports a global estimate; tune thresholds once you see your data):
- Passive estimate tracks the real MODQ total with **MAE ≤ 8 points** and **Spearman ρ ≥ 0.7** on held-out days.
- Direction-of-change agreement (better/worse week-over-week) ≥ 80%.

**Safety gates** (binary — fail any → reject the narration):
- Frames as a **trend**, never a single-point verdict.
- **No diagnosis**; states explicitly it is a personal signal, not a clinical score.
- **No false reassurance / no prediction** ("you'll be fine", "you'll recover by X").
- **No causal claims** from correlation ("walking is down *and* you also travelled" — never "travel caused it").
- Deterioration / red-flag pattern → escalated to "see a clinician".

**Narration quality** (100 pts): clarity for a frightened reader · confounder honesty · calibration (no overconfidence) · counter-catastrophizing tone *without* dishonesty.

**Repeatable:** swap the signal set + condition (knee rehab, post-op, MS) and the same pipeline + gates rerun. Another team reruns tomorrow by changing the source adapter and the ground-truth column.

## Build-Day timeline (8h)
- **H0–1:** export my Apple Health data; parse `export.xml` → normalized daily signal table; eyeball coverage across my real flare window.
- **H1–3:** personal baselines; signal → ODI-section mapping; composite index in JS; first trend chart on screen.
- **H3–5:** Opus fusion + calibration against my real ODI days; the "why it moved" narration; wire the safety rubric + judge pass.
- **H5–7:** trend UI polish; the catastrophizing-pushback interaction; add one wearable source (Whoop/Oura) only if cheap.
- **H7–8:** deploy to a live URL; run the eval (MAE / ρ / direction agreement); rehearse the demo twice on my real flare→recovery window.

## Demo script (~4 min)
1. **"When my sciatica was severe, this chart was the only thing I cared about."** Show the manual ODI dots — sparse, with gaps on the worst days.
2. **"Now watch it fill itself in."** Load my real Apple Health export → the passive index draws a *continuous* line through the same window.
3. **The validation moment:** overlay the real ODI dots — they land on the passive line. Real data, not a mock.
4. **Click the dip:** Opus explains it from the signals (walking asymmetry spiked to ~25%, steps fell to ~800/day, speed down a third), then gives the honest trend read: *"your worst week — but the slope turned weeks ago."*
5. **The psyche beat:** *"On my darkest day, this would have told me the trend had already turned."* That's the product.
6. **Vision:** any condition, your data, on your device — and here's the eval proving it tracked my real ODI within tolerance.

## Risks & mitigations
- **Integration plumbing eats the day** → pre-export the real data; **no live OAuth in the demo**. Live part = Opus narration + the chart.
- **n=1 validity** → frame as a *personal* signal; the real-ODI overlay is the honest proof; never claim clinical validity.
- **Anxiety amplification** → trends-not-points, no single-day alarms; the narration is gated to be calming-but-honest.
- **Confounders** → Opus *names* them in the narration; never asserts cause.
- **MRI category error** → baseline context only; stated plainly.
- **Demo visual is "just a chart"** → carry it on storytelling (real flare, real recovery, your voice) + the Opus narration surprise; consider animating the line drawing in.

## Status of prerequisites
1. ✅ **Done — data confirmed.** Gait + volume are dense across the May–Sep 2025 window (walking speed 151/153 days, asymmetry 129, steps every day). Sleep / HRV / resting HR and standing are **absent** (no synced Apple Watch in the window); travel/social location history isn't in a HealthKit export. So the build is gait-led and phone-only.
2. ⏳ **Outstanding — labels.** Need **real MODQ total scores on ~6–12 days** across the window to calibrate + hold out. If not journalled, reconstruct from memory and label clearly.
3. Optional: a wearable would add sleep/HRV for a future version — not needed for Build Day.
