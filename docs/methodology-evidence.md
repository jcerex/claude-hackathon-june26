# Throughline — Methodology Evidence

**The empirical basis for what we build.** This document records the full investigation behind Throughline (a passive sciatica recovery-trajectory tracker) on one real, fully-instrumented episode, and states honestly what the data does and does not support.

- **Subject:** n = 1 (Jamie), one sciatica episode.
- **Analysis date:** 2026-06-13.
- **Window:** primary episode May–Oct 2025; gait context Sep 2024–Jun 2026.
- **Bottom line up front:** passive phone gait is a **good within-episode *trajectory* signal** (direction), a **poor absolute-score** signal, and **cannot predict onset** (it is a consequence of pain, not a precursor). The defensible product is a *personalized, trend-not-point* tracker. Onset prediction needs a different, *leading* data class (calendar exposure + wearable). Everything below is one subject and must not be read as clinically validated.

## 0. Who this is for — population context

Low back pain affects **628.8 million people globally** (GBD 2021) and is the world's #1 cause of disability; projections put this above 800 million by 2050. Sciatica — the specific condition Throughline is calibrated to — has an annual prevalence of 2.2–5% (roughly **180–400 million people** experiencing an episode in any given year) and a lifetime prevalence of 13–40% of adults. Lumbar disc herniation, the underlying structural cause in most sciatica cases, affects 1–3% of the population (~**80–240 million** globally); 95% of cases involve L4–L5 or L5–S1, the same levels as this episode.

Throughline's target user is narrower than the full LBP population: people who have had a clinical episode, have recovered or are recovering, but carry the underlying injury and face ongoing flare risk. A conservative estimate of this group is **50–100 million people** worldwide — post-flare, managing long-term.

| Stat | Figure | Source |
|---|---|---|
| Global LBP prevalence (2021) | 628.8 million | [GBD 2021, Frontiers in Public Health](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2024.1480779/full) |
| Projected LBP by 2050 | 800 million+ | Same |
| Sciatica annual prevalence | 2.2–5% (~180–400M) | [Epidemiological review, ResearchGate](https://www.researchgate.net/publication/23387401_Sciatica_Review_of_Epidemiological_Studies_and_Prevalence_Estimates) |
| Sciatica lifetime prevalence | 13–40% of adults | Same |
| Lumbar disc herniation prevalence | 1–3% (~80–240M) | [PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0310550) · [NIH StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK441822/) |

This analysis is n=1, but the signals it validates (gait→ODI direction, relapse detection) — if they generalise even partially — have an enormous potential reach.

---

## 1. Data sources

| Source | What it provided | Access |
|---|---|---|
| **Apple Health export** (`export.xml`, 246 MB, HealthKit v14) | Daily gait + activity: walking speed, asymmetry %, double-support %, steadiness, steps, distance, flights | Streamed with `parse_health.py` |
| **`recovery_tracker` Postgres** (local) | 14 Modified Oswestry (MODQ) total scores + 10-item breakdowns; 6 logged clinical events | `surveys`, `survey_responses`, `events` tables |
| **Outlook calendar** (work) | Exposure/context events (travel, meetings, medical) around onset & relapse | Read via browser (Claude in Chrome), May–Aug 2025 |

**Not available in the episode window:** sleep, HRV, resting heart rate, and standing-time — all watch-derived, and **no Apple Watch was synced May–Sep 2025** (every 2025 record came from the iPhone). Travel/location history is not in a HealthKit export.

---

## 2. The reference episode

MODQ total (0–100, higher = worse) from `recovery_tracker.surveys`, with logged events:

| Date | MODQ | Event (same week) |
|---|---|---|
| 2025-06-27 | — | **ER — back & leg pain (onset)** |
| 2025-06-28 | 82 | |
| 2025-07-15 | 80 | started treatment, Dr Lowe |
| 2025-07-29 | 70 | |
| 2025-08-04 | 58 | |
| 2025-08-11 | 46 | |
| 2025-08-18 | 38 | (recovering) |
| 2025-08-12 | — | **bad massage + overwalking (relapse trigger)** |
| 2025-08-21 | 68 | |
| 2025-08-25 | 70 | |
| 2025-08-29 | 82 | (relapse peak) |
| 2025-08-22 | — | epidural steroid injection |
| 2025-09-03 | — | 1am ED visit |
| 2025-09-06 | 78 | |
| 2025-09-07 | — | "pain gone, foot tingling" |
| 2025-09-08 | 48 | |
| 2025-09-10 | 34 | |
| 2025-09-22 | 20 | |
| 2025-10-01 | 12 | (recovered) |

This is a **non-monotonic** recovery: a deep initial flare, partial recovery, a real **relapse** in late August, then resolution. That structure is what makes it a useful test case.

---

## 3. Finding 1 — gait reflects the episode (descriptive)

Coverage in-window was dense for iPhone-derived signals: walking speed 151/153 days, asymmetry 129, double-support 149, steps & distance every day; sleep/HRV/RHR = 0.

Weekly means trace the episode unambiguously:

| Signal | Baseline | Trough (wk of 30 Jun) | Recovered (early 2026) |
|---|---|---|---|
| Walking speed | ~4.4 km/h | **2.96** | ~4.4–4.8 |
| Walking asymmetry | ~1–2% | **~31%** | ~2% |
| Steps/day | ~8,000 | **799** | 10,000–15,000 |

The gait crash, the late-August relapse, and the recovery are all visible in the raw passive signal.

---

## 4. Finding 2 — a passive index calibrates to the MODQ

A severity index built from **walking speed + step count** (z-scored, equal-weighted, ±3-day smoothing), linearly calibrated to the MODQ total over the 14 surveys (`calibrate.py`):

| Metric | Value |
|---|---|
| R² (in-sample, n=14) | **0.693** |
| MAE (in-sample) | 9.1 MODQ points |
| MAE (leave-one-out) | 10.5 |
| Pearson r (implied) | ≈ 0.83 |

**Feature correlations with MODQ total:** walking speed **−0.82**, steps **−0.76**, walking asymmetry **+0.26**.

> **Correction to an early assumption.** We initially expected walking *asymmetry* to be the star (it spikes dramatically — ~1–2% → ~31% at the trough). At survey-date resolution it is the *weakest* of the three (r=+0.26): the spike fires only in the very worst weeks and is sparse/noisy. **Speed and steps degrade proportionally across the whole range and track the gradient far better.** A 3-feature composite including asymmetry scored R²=0.59; dropping it to speed+steps raised it to 0.69. Asymmetry is a dramatic "very bad" flag, not a good calibrator.

---

## 5. Finding 3 — real signal, or a narrative that fits the data?

Two pre-registered checks were run to attack the result (`analysis.py`).

### 5a. Circularity test — does gait predict NON-walking items?
The MODQ contains a walking item, so predicting it from walking data risks tautology. We correlated the gait index against each of the 10 MODQ items:

| Item | r | | Item | r |
|---|---|---|---|---|
| walking | +0.84 | | personal_care | +0.85 |
| sitting | +0.80 | | lifting | +0.73 |
| social_life | +0.80 | | **pain_intensity** | **+0.79** |
| standing | +0.79 | | **sleeping** | **+0.69** |
| traveling | +0.67 | | employment | +0.66 |

**Verdict: tautology largely cleared.** Gait predicts self-reported **pain intensity (0.79)** and **sleep disruption (0.69)** — items unrelated to walking — almost as well as the walking item. The items move together (one underlying severity factor during a flare), and gait proxies that factor. This is the *common-cause* (pain → gait + all symptoms) mechanism, which is the kind that could generalize. Caveat: still one episode, and pain/walking are themselves correlated.

### 5b. Forward validation — was the cross-validation honest?
Leave-one-out is optimistic for a smooth time series (a held-out day's neighbors leak). We re-tested prospectively:

- **Expanding-window, one-step-ahead** (train on past surveys only, predict the next): **forward MAE = 14.9** — markedly worse than LOO's 10.5, confirming LOO was optimistic. Errors are largest at turning points, where the model **lags** (it kept predicting "still severe" through recovery).
- **Block test** (train through 18 Aug, predict the relapse + recovery *cold*): **test r = +0.94**, **MAE = 14.0**. It nailed the *shape* — caught the late-August relapse out-of-sample — while the *absolute level* drifted (it over-predicts severity in the recovery tail, because **gait recovers more slowly than pain**).

**Verdict:** the method is a **good direction/trajectory estimator and a poor absolute-score estimator** (honest error ≈ ±15 points, biased and lagging at extremes).

---

## 6. Finding 4 — lead/lag: tracking, not prediction

Does gait deterioration *precede* survey-confirmed worsening? Lag correlation of MODQ vs gait shifted ±k days (`leadlag.py`):

| gait timing vs survey | r |
|---|---|
| 7d before | +0.15 |
| 3d before | +0.50 |
| **same day** | **+0.83** |
| 3d after | +0.76 |
| 7d after | +0.67 |

If gait led, the *before* rows would be strongest; they are weakest. Correlation peaks **same-day** and stays high *after* → gait is **coincident-to-lagging, not leading.**

- **Onset (June):** walking speed was flat-normal (4.14–4.46 km/h) through 26 Jun, then cliff-edged from 27 Jun (3.42 → 2.17). **No multi-day precursor — the episode was acute.** Gait is a *consequence* signal; by the time it moves, the episode has begun, so it structurally cannot forecast onset.
- **Relapse (August):** the gait estimate rose 49→55→64 across 18–20 Aug as the survey jumped to 68 on 21 Aug — roughly *coincident* (±1–2 days), within noise.
- **The one phone-only *leading* signal:** an **over-activity spike** — steps hit 8,692 on 8 Aug against a recovering baseline of ~3,500 (~2×), preceding the 12 Aug trigger. Behaviour→risk, not symptom precognition. Suggestive (single instance), mechanistically sound.

**Practical reframe of "early warning":** the value is **continuous, survey-free, real-time detection** — it flags worsening *on the day*, between the sparse surveys a person would actually fill in — *not* precognition.

---

## 7. Finding 5 — exposure/calendar: the onset trigger gait couldn't see

Outlook calendar around each event (read May–Aug 2025).

**Onset (late May–June) was preceded by a long-haul trip + multi-day conference (heavy seated load):**
- **27 May** — United 324 Sydney → San Francisco (long-haul, ~14h seated).
- **early June** — AI Engineer World's Fair / Agents Hackathon (SF) + return long-haul (~early–mid June).
- **27 Jun** — ER (onset). **28 Jun** — Cairns trip begins (the day *after* onset).

> Note: "Travel Double Bay" (19 Jun) is **not** an exposure event — Double Bay is the Sydney suburb Jamie was living in, so it was a local trip, not travel. (Corrected after an initial misread; it had been counted as a proximate travel event.)

**Relapse (August) had no travel** — it was the logged mechanical incident (massage + overwalking, 12 Aug). The calendar instead shows the medical fallout: doctor calls, "Check health insurance silver for back" (~20 Aug, before the 22 Aug epidural), "Doctor cert" (late Aug).

**Why this matters:** the two episodes have different signatures — onset followed a **long-haul round trip + multi-day conference** (heavy seated load), the relapse was a **discrete mechanical insult**. Long-haul flights are a recognised disc/sciatica aggravator (prolonged seated lumbar flexion, dehydration, luggage lifting), so this is a *mechanistically plausible antecedent* — and unlike gait, **calendar exposure exists *before* symptoms.** It is a genuine *leading* signal class. Caveat — and it is a real one: this is retrospective pattern-matching on one episode (high confirmation-bias risk); plenty of long-haul flights cause no flare; the SF round trip was **~3–4 weeks before onset (temporally loose)**; and the Cairns trip began the day *after* the ER, so it was more likely a casualty of the flare than its cause. The exposure evidence is thinner than a "cluster" — it is essentially **one long-haul trip several weeks prior**.

---

## 8. What we can and cannot claim (scorecard)

| Claim | Status | Basis |
|---|---|---|
| Gait (speed+steps) tracks within-episode disability *direction* for this person | **Supported** | R²=0.69; block-test direction r=0.94 |
| It reflects a general severity factor, not just the walking item | **Supported** | Predicts pain r=0.79, sleep r=0.69 |
| It yields an accurate *absolute* MODQ score | **Not supported** | Forward MAE ≈15; biased; lags recovery |
| It *predicts/leads* worsening (precognition) | **Not supported** | Coincident-to-lagging (peak r at lag 0) |
| It predicts episode *onset* | **Not supported** | Onset acute; gait is a consequence signal |
| Over-exertion (activity spike) precedes a flare | **Suggestive** | One instance (8 Aug); plausible mechanism |
| Travel/exposure load precedes onset | **Suggestive (weak)** | One episode; a single long-haul trip ~3–4 wks prior (loose timing); confirmation-bias risk |
| Generalizes across people | **Untested** | n=1 |
| Works in the low/baseline range (MODQ 0–20) | **Untested** | No labels below 12 in-window |
| Specific to sciatica vs any mobility hit | **Untested** | No discriminant cases |

---

## 9. Limitations

- **n = 1, one episode.** Everything within-subject. Between-person generalization is unproven; absolute calibration is person-specific by construction.
- **Retrospective + confirmation bias.** Outcomes were known before analysis; the calendar correlation especially was found by looking for it.
- **Sparse labels (14), all in the active range.** No baseline (low-disability) labels; behaviour in the 0–20 band is unknown.
- **Behaviour ≠ impairment.** Low steps can be choice, context, or hospitalization, not only capacity.
- **MODQ noise floor.** Its minimal detectable change is ~10–15 points; our error (~10–15) sits near the instrument's own noise — a wide target.
- **Calibration is per-person** and must be re-learned from each user's own occasional surveys.

---

## 10. Implications for what we build

1. **Build a *personalized trajectory* tracker, not a score calculator.** Surface **direction + a confidence band** ("improving / plateauing / worsening", roughly which severity band) — never a precise number. "Trends, not points" is the honest *and* safe framing.
2. **Per-person calibration is a feature, not a footnote.** Learn each user's gait↔symptom mapping from their own occasional MODQ; prompt for a survey when the estimate is uncertain (active learning) to minimise burden.
3. **Within-episode value tiers** (supported → speculative): real-time turning-point detection ("you're past the worst") → survey-free worsening detection → over-exertion pacing flag → counter-catastrophizing narration → auto pre-appointment summary.
4. **Onset prediction is a separate, future track** requiring *leading* signals gait lacks: **calendar exposure** (flights, long drives, packed sitting weeks — automatable), **wearable sleep + HRV**, and a **daily one-tap prodrome**. The calendar finding makes exposure a *leading data class worth instrumenting* for onset risk — though on this one episode the evidence is a single long-haul trip, not proof.
5. **Reset the "done" gate to reality:** the original brief's MAE ≤ 8 is unachievable here; the honest, met bar is **LOO MAE ≤ 12 and r ≥ 0.8** (we got 10.5 / 0.83). The *block-test direction* (r=0.94) is the headline metric for a trajectory product.
6. **YMYL discipline throughout:** no diagnosis, no precise prognosis, escalation prompts on sustained deterioration, data user-controlled.

---

## 11. Reproducibility

All scripts in `claude-hackathon/`. Data inputs are git-ignored (personal health data); regenerate as below.

| Script | Does | Inputs → outputs |
|---|---|---|
| `parse_health.py` | Stream `export.xml`, daily aggregates over a date window | `apple_health_export/export.xml` → `daily_signals.csv` |
| `trend.py` | Weekly gait means for charting | `daily_signals.csv` → `trend.json` |
| `calibrate.py` | Fit speed+steps index to MODQ; fit stats | `daily_signals.csv` + MODQ totals → `calibration.json` |
| `analysis.py` | Circularity (item-level) + forward validation | `modq_items.csv` + `daily_signals.csv` |
| `leadlag.py` | Lead/lag correlation + onset/relapse daily views | `daily_signals.csv` + MODQ totals |

MODQ totals/items come from `recovery_tracker` Postgres (`surveys`, `survey_responses`, `events`). Calendar read manually from Outlook for May–Aug 2025.

---

## 12. Open questions / next experiments

1. **Multi-subject data** — the real external-validity test; does the speed/steps→severity *direction* hold across people (slopes will differ)?
2. **Blocked/forward CV as the default metric** going forward, not LOO.
3. **Denser labels at recovery + baseline** to test the low range and the gait-lags-recovery bias.
4. **Discriminant validity** — does the signal distinguish a sciatica flare from a non-spinal mobility hit (illness, knee injury)?
5. **Exposure → onset-risk model** — combine calendar load + wearable sleep/HRV + prodrome tap; test whether a pre-flare risk window is detectable.
6. **Over-exertion → relapse** — confirm whether relative activity spikes lead worsening across more episodes.
