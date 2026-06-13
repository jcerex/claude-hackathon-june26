# Tributary — Build Day Brief

**Codename: Tributary** *(placeholder — "tributary" = streams of lived experience feeding one river of evidence; "tribute" = contributors get paid. Rename freely.)*

## One-line pitch
Opus 4.8 reads real patient treatment stories, structures them into honesty-layered real-world evidence, grades its own safety against a rubric, and renders the cohort on a 3D spine — **bootstrapped from public data today, contributor-owned and paid tomorrow.**

## The problem
- A person with sciatica gets a wall of conflicting advice and an N-of-1 guess. *"What actually helped people like me?"* has no good answer.
- The evidence that exists is RCT-shaped: averaged, slow, and blind to **subtype** — disc vs stenosis vs piriformis, where the *right* move is often the exact opposite (extension helps a disc, worsens stenosis).
- Meanwhile millions of real treatment stories sit in public forums, unstructured and unusable — and the patients who wrote them own none of the value.

Three losers: the **patient** (no personalised signal), the **clinician/researcher** (no structured real-world evidence at subtype resolution), and the **contributor** (gives data, gets nothing).

## Who it's for
- **Primary:** people living with sciatica / chronic low back pain — low back pain is the world's **leading cause of disability** (~600M people).
- **Secondary:** clinicians and researchers who want subtype-resolved real-world signal.
- **The moonshot constituency:** contributors who should own and be paid for their data.

## Why now / why Opus 4.8
The bottleneck was never the data — it's that turning messy, confounded, free-text illness narratives into *trustworthy* structured evidence required human experts at a scale nobody could afford. Opus 4.8 does it per-story in seconds: extract, infer subtype, flag every confounder, catch red flags — and then **grade its own output for safety**. That self-policing is the unlock for evidence in YMYL territory.

## Build-Day scope — what we actually build
The **evidence engine + the demo surface.** Not the marketplace.

**IN**
1. `pipeline.workflow.js` — mine (cached corpus + optional live) → extract structured records → safety-gate each → aggregate by intervention × subtype → synthesise honesty-layered insights → judge against `rubric.md`.
2. The 3D spine (reused from `../spine-app/web`) as the front-end: render the **cohort** aggregate, fly to clusters, click an intervention to see the honest read.
3. A live *"paste a real post → watch it join the cohort"* path.
4. Deployed to a live URL.

**OUT** (vision, narrated — not built): payments, contributor accounts, data-ownership/consent infra, any first-party PII collection. See non-goals.

## The moonshot (narrated in the demo, not built)
> "Today this is mined from public posts. v2: you contribute your own record, you *own* it, and you're paid when a researcher or device-maker uses the aggregate. A patient-owned evidence commons — and the same pipeline runs on migraine, endometriosis, long COVID tomorrow."

The demo proves the **engine**. The vision extrapolates from something *working in front of the judges* — not a promise on an empty shell. That is the difference between "wildly ambitious" and "pitch deck".

## Demo script (~4 min, de-risked)
1. **Open on the 3D spine** — one person's scan. *"One person is an anecdote."*
2. **"Watch this."** Fire the pipeline over a **pre-cached** corpus of real stories → records resolve → the spine now shows the **cohort** (where findings cluster; what they tried).
3. **Live ingest** one fresh r/Sciatica post → Opus extracts it on stage → it joins the cohort. *(Proof it's real, not canned.)*
4. **An insight with the honesty layer** — "people with the disc subtype most-reported McKenzie + walking as helpful — *and here's the base-rate caveat, the subtype caveat, the confidence.*"
5. **The model grades itself** — show the judge's safety verdict on that insight, in the UI.
6. **Narrate the moonshot**, then the kicker: **"same pipeline, pointed at migraine"** (pre-cached) — repeatability, live.

**De-risk:** pre-harvest the corpus *before* the demo (real data, just cached) so the aggregate is instant; only *one* live ingest, with a captured fallback ready.

## What "done" looks like (verifiable by the model, no human)
1. `pipeline.workflow.js` runs end-to-end over `eval/cases.jsonl` with no error.
2. **Extraction fidelity ≥ 85%** — field-level match (intervention + outcome + inferred subtype) vs the `expected` in the test set.
3. **100% of outputs pass the hard safety gates** in `rubric.md` (zero diagnosis / prescription / causal claims; red flags surfaced; no PII).
4. The red-flag case (`case-cauda-equina`) is **never** aggregated as routine — it is escalated.
5. Aggregate insights score **≥ 80/100** on the rubric (judged by the judge agent).
6. The deployed URL renders the aggregate on the 3D spine and returns **200**.

## How it maps to the judging criteria
| Criterion | Weight | How this kit secures it |
|---|---|---|
| **Impact** | 35% | Real evidence base from real patients (*present*) **+** patient-owned data commons for the world's #1 disability (*moonshot*). |
| **Demo** | 35% | Gorgeous 3D spine (asset already exists) + live ingest + self-grading verdict on screen. Cached corpus keeps it bulletproof. |
| **Opus 4.8** | 15% | Agentic mining, messy-text → structured extraction, subtype inference, confounder-aware synthesis, **and a self-policing judge**. |
| **Orchestration** | 15% | `rubric.md` (gradeable spec) + `eval/cases.jsonl` (test suite) + a condition-agnostic workflow → "done" is model-verifiable and **reruns on any condition tomorrow** by changing one arg. |

## Non-goals / guardrails (the YMYL spec)
- **No prescription, ever.** "People reported", never "you should".
- **No diagnosis.** We describe what stories say; we never tell someone what they have.
- **No causal claims** from observational data. Associations only, confidence ≤ *moderate*.
- **Public data only; no PII.** Strip usernames/identifiers at harvest. No first-party health data collected on Build Day.
- **Red flags escalate, never aggregate.** Safety beats completeness.
- **The honesty layer is mandatory** on every aggregate insight — it *is* the product, not a disclaimer.

## Risks & mitigations
- *Data validity (confounding, natural history, subtype).* → The honesty layer is the feature; base-rate + subtype caveats are **gated, not optional**.
- *Live pipeline flakiness.* → Cached corpus is the spine of the demo; one live ingest with a fallback.
- *Source ToS / scraping.* → Public posts, light volume, attribution, no PII; treat as illustrative RWE, not redistribution.
- *YMYL drift.* → `rubric.md` + the judge agent block it mechanically; the red-flag test case proves it.
- *Hallucinated numbers.* → Aggregates are computed in **plain JS** from the records; the model only narrates them.

## Architecture
- **Orchestration:** `pipeline.workflow.js` (dynamic workflow). Extract is a `pipeline()` — no barrier, each story flows extract→gate independently. Aggregate is a deliberate **barrier** (it needs the full record set). Judge fans out with `parallel()`.
- **Model:** Opus 4.8 for extraction, subtype inference, synthesis, and an *independent* judge pass.
- **Front-end:** the existing Three.js spine (`../spine-app/web`), fed `aggregates` + `insights` from the workflow return.
- **Eval / "done":** `eval/cases.jsonl` is the test suite; `rubric.md` is the gradeable spec.

## Rough Build-Day plan (8h)
- **H0–1:** lock scope; copy spine front-end; wire a stub aggregate into it.
- **H1–3:** get `pipeline.workflow.js` green over `eval/cases.jsonl`; hit the fidelity + gate thresholds.
- **H3–5:** aggregate → 3D render; the click-to-honest-read interaction.
- **H5–7:** live-ingest path + demo polish; pre-harvest the demo corpus; second condition (migraine) cached.
- **H7–8:** deploy; run the "done" checklist; rehearse the 4-min demo twice.
