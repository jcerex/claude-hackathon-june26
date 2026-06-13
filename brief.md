# Throughline — Build Day Brief

**Codename: Throughline** *(placeholder — the signal-through-the-noise line you hold onto through a flare. Rename freely.)*
*A passively-collected recovery trend line for sciatica.*

## One-line pitch
The chart you're glued to during a severe flare — except it fills itself in from your phone and wearable instead of a survey, and Opus 4.8 tells you, honestly, which way you're actually heading.

## The problem (lived)
When sciatica is severe, everything else goes quiet. The only question that matters is *"am I getting better or worse?"* — and the answer runs your whole psyche: hope or despair. The best objective answer today is the **Modified Oswestry Disability Index** (MODQ — the physio-standard low-back disability survey) — a 10-question survey, taken sporadically, plotted by hand. (I lived this, glued to the chart.) It's manual, low-frequency, and you stop filling it in on the worst days, exactly when you need it most.

## The insight
Most of what the ODI measures — walking, sleep, sitting/standing tolerance, getting out of the house — **is already being recorded** by the phone in your pocket and the band on your wrist. You don't need to *ask* how far someone can walk if their phone already logged that their walking speed fell 14% this week. **Turn the survey into a signal.**

## Who it's for
- **Primary:** people in a severe sciatica / chronic-pain episode who need a low-effort, objective read on their trajectory — and the reassurance that comes with it.
- **Generalizes** to any function-tracked recovery: post-op, knee/hip rehab, MS, long COVID.

## What it does
1. Continuously estimates a 0–100 **functional recovery index** from passive signals, anchored by a daily **one-tap** pain score and calibrated against the occasional *real* MODQ **total score** (not section-by-section — see below).
2. Shows the **trend, not the point** — a 7/30-day line — with Opus narrating each move in plain, honest language and pushing back on catastrophizing: *"today's a spike; the week is still up."*
3. Surfaces deterioration / red-flag patterns for clinical attention. Never diagnoses.

## What the questions actually measure (Modified Oswestry / MODQ)
Reading the 10 MODQ items matters: most grade *subjective pain* or *tolerance*, not how you move — so most can't be passively sensed, and the two you'd most expect to (sleeping, standing) need an Apple Watch that wasn't worn in the demo window.

| # | MODQ item | Grades | Passive proxy | In this dataset? |
|---|---|---|---|---|
| 4 | **Walking** | distance before pain stops you | **steps + distance** | ✅ strong |
| 8 | Social life | going out / activities | location, steps | partial (steps) |
| 5 | Sitting | sitting tolerance (time) | sedentary bouts | weak / ambiguous |
| 1 | Pain intensity | subjective severity | **one-tap self-report** | self-report only |
| 2,3 | Personal care, Lifting | autonomy / load | — | no |
| 6,7 | Standing, Sleeping | tolerance / sleep loss | watch stand & sleep | ✗ no watch in window |
| 9,10 | Travelling, Employment | journey / work capacity | location history | ✗ not in HealthKit export |

**Bottom line — the honest correction:** only **1 of 10 items (walking)** has a clean passive proxy here, and it's **step count / distance**, not walking speed. Walking **speed and asymmetry map to no single item** — there's no "how fast/evenly do you walk" question — so they act as a **global severity signal** instead (and they're the *best* flare detector we have). So we do **not** reconstruct the questionnaire section-by-section; we estimate the **total MODQ score's trajectory** from gait quality + walking volume, **calibrated against the real total score**. That makes the **one-tap pain score** more central, since the pain/subjective items can't be sensed.

## Data sources (ranked by role)
- ⭐ **Gait quality — walking asymmetry, speed, double-support** (iPhone-derived). Maps to no single item; it's the **global severity signal** and the strongest flare detector. Sciatica makes you limp (asymmetry), slow down, and spend longer on two feet.
- ⭐ **Walking volume — steps + distance.** The proxy for the MODQ **walking item**, plus an activity/effort signal (and a partial stand-in for the social item when you stop leaving home).
- **One-tap pain (0–10).** Now the primary subjective anchor — the pain / personal-care / lifting items can't be sensed, so this carries them.
- **Medications** — pain-med frequency as a behavioural signal (if logged).
- **Sleep / HRV / resting HR — unavailable in this dataset** (no synced Apple Watch in the window). A future enrichment, not a Build-Day input — narrate as "add a wearable to deepen it."
- **MRI/scans — baseline context only, NOT a tracking input.** Imaging changes over months and correlates poorly with symptoms; fusing it into a *daily* score is a category error.

## What the data already shows (validated)
Parsed against Jamie's own export, the May–Sep 2025 flare is unmistakable in the passive signals alone — **walking speed 4.4 → 3.0 km/h, asymmetry ~2% → ~25%, steps ~8,000 → ~800/day** at the trough (week of 30 June) — recovering to baseline by early 2026. The signal exists and tracks the episode. The only remaining input is the real MODQ scores to fix the absolute scale.

## Scope
**IN:** ingest a real Apple Health export (mine) + optionally one wearable; the fusion + personal-baseline + calibration pipeline; the trend UI; Opus narration; the "passive-vs-real-ODI" eval. Deploy to a live URL.
**OUT (vision, narrated — not built):** live multi-OAuth integrations, a native iOS app, population-scale clinical validation, multi-user / clinician sharing.

## Honesty & safety spec (YMYL)
- **Trends, not points** — the anxiety guard. No alarming single-day alerts.
- *"Here's what your data shows"* — never *"you're fine"* or *"you'll recover."*
- **No diagnosis.** The index is an explicitly-personal signal, not a validated clinical score.
- **No section-level overclaim.** We estimate the *total* trajectory, not individual MODQ items; the index is a calibrated proxy, not the questionnaire.
- Deterioration → suggest a clinician; red-flag patterns escalated.
- Data stays **user-controlled / on-device**.

## How it maps to the judging criteria
| Criterion | Weight | Why |
|---|---|---|
| **Impact** | 35% | An objective trajectory + an antidote to catastrophizing for the under-served *psychological* axis of chronic pain. Generalizes to any recovery. |
| **Demo** | 35% | **You are the dataset** — real Apple Health export across a real flare→recovery, with the real ODI dots landing on the passive line. Provable, personal, no fake data. |
| **Opus 4.8** | 15% | Fuses gait quality + walking volume + a pain tap into a calibrated severity estimate, with honest "why it moved" narration and counter-catastrophizing. Beyond a basic integration. |
| **Orchestration** | 15% | The cleanest "done" of any option: passive estimate vs **real ODI** → MAE / correlation on held-out days. Model-gradeable, repeatable across conditions. |
