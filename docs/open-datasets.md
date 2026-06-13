# Open Datasets — External Evidence & Validation Resources

Cross-reference: [methodology-evidence.md](methodology-evidence.md) — particularly §0 (population context), §12 (open questions), and §8 (what we can/cannot claim).

## Population context — how many people could this reach?

| Condition | Global figure | Type | Source |
|---|---|---|---|
| Low back pain | **628.8M** (2021); **800M+** by 2050 | Point prevalence | [GBD 2021, Frontiers in Public Health](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2024.1480779/full) |
| Sciatica (annual) | **~180–400M** (2.2–5% of population) | Annual prevalence | [Epidemiological review, ResearchGate](https://www.researchgate.net/publication/23387401_Sciatica_Review_of_Epidemiological_Studies_and_Prevalence_Estimates) |
| Sciatica (lifetime) | **13–40% of adults** | Lifetime prevalence | Same |
| Lumbar disc herniation | **~80–240M** (1–3% of population) | Point prevalence | [PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0310550) · [NIH StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK441822/) |

Throughline's target user — post-flare, recovered but carrying the underlying injury — is a conservative subset of the sciatica/LDH population, estimated at **50–100M people** globally. LBP is the world's #1 cause of disability (GBD 2021). The external datasets below are the validation path toward generalising beyond n=1.

Scanned: 2026-06-13. Relevance judgements are relative to the Throughline gait↔MODQ/ODI methodology on one sciatica episode.

---

## Tier 1 — directly relevant (act on these)

### Patient Trajectory Subgrouping Dataset
- **URL:** https://arxiv.org/abs/2404.10580 (+ public GitHub repo)
- **What:** 847 non-specific LBP patients (18–65 y), 52-week follow-up, baseline risk factors, weekly pain intensity + activity-limitation self-reports.
- **Access:** Public GitHub — free download.
- **Why it matters:** The largest public longitudinal LBP dataset structured like what Throughline produces. No wearable/gait data, but 847 weekly-PRO trajectories let you test whether the turning-point and trajectory-shape findings from §§3–6 of methodology-evidence.md are idiosyncratic to one episode or structurally typical. Directly addresses open question §12.1 (multi-subject direction validity) at the PRO level.

### Multi-Pathology Clinical Gait Dataset (Nature Scientific Data, 2025)
- **URL:** https://www.nature.com/articles/s41597-025-05959-w
- **What:** 1,356 gait trials from 260 participants — healthy, neurological, and orthopedic cohorts. 4 IMUs including lower back, 11+ hours of time-series gait data.
- **Access:** Open access article; dataset download via Nature Scientific Data.
- **Why it matters:** Contains orthopedic participants with lower-back IMU data — the closest public analogue to Apple Health walking speed/asymmetry. Can be used to validate that the gait features in Throughline's index (speed, steps) behave similarly in an instrumented clinical setting, and to test §12.4 (discriminant validity: sciatica vs other mobility impairments).

### GaitPy + ADAPT Dataset
- **URL:** https://github.com/lsy3/GaitPy · https://zenodo.org/records/3528115
- **What:** Open-source Python package for extracting clinical gait features from lower-back (L5) accelerometer data. ADAPT dataset: 20 participants, 12 body-worn IMUs, semi-structured and daily-life environments.
- **Access:** pip-installable; Zenodo dataset free.
- **Why it matters:** GaitPy's feature set (extracted from L5 IMU) maps closely to what HealthKit exposes. Useful for cross-validating that Apple Health's walking speed/asymmetry represent the same underlying gait constructs, and as a reference implementation for clinical gait feature extraction.

---

## Tier 2 — useful for the leading-signal track

These are relevant to the onset-prediction north-star (§10.4 of methodology-evidence.md) rather than the proven tracking engine.

### Wearable HRV + Sleep Diary Dataset (Nature Scientific Data, 2025)
- **URL:** https://www.nature.com/articles/s41597-025-05801-3
- **What:** 49 healthy participants, 4 weeks, continuous smartwatch HRV (sampled every 100ms, 5-min segments) + daily sleep diaries + biweekly questionnaires (anxiety, depression, insomnia).
- **Access:** Open access; dataset download via Nature Scientific Data.
- **Why it matters:** Ground truth for wearable HRV + subjective health correlation methodology. Useful for designing the Whoop/Oura→flare-risk feature pipeline — and for understanding what HRV signal-to-noise looks like in daily-life conditions before committing to it as a leading indicator.

### DREAMT v2.0 (PhysioNet)
- **URL:** https://physionet.org/content/dreamt/2.0.0/
- **What:** Wearable E4 signals (100 Hz) with polysomnography ground truth for sleep stage classification.
- **Access:** PhysioNet — free after registration.
- **Why it matters:** Validated reference for wearable sleep quality estimation. Relevant if building the sleep→flare-risk pipeline from Whoop/Oura, where sleep stage accuracy matters.

---

## Tier 3 — reference / benchmarking

Not actionable in the near term, but worth knowing about.

### SPORT Trial (NIH/Dartmouth)
- **URL:** https://clinicaltrials.gov/study/NCT00000410
- **What:** 501 RCT + 743 observational cohort, lumbar disc herniation; surgical vs non-operative outcomes; 8-year follow-up including functional outcomes and ODI.
- **Access:** Contact SPORT research team for data access.
- **Why it matters:** Gold-standard longitudinal ODI dataset for disc herniation — the pathology most relevant to Throughline's target users. Recovery curves here are the external benchmark for "is this trajectory typical?" Throughline's tracking engine, once multi-subject, could be validated against these curves.

### NIH Minimal Dataset for Chronic Low Back Pain
- **URL:** https://pubmed.ncbi.nlm.nih.gov/31107833/
- **What:** Standardized 40-item protocol (17 PROMIS items + STarT Back + 21 categorical variables) adopted internationally for chronic LBP research.
- **Access:** Open standard — no licensing restrictions.
- **Why it matters:** If Throughline's conversational PROM expands beyond Modified Oswestry, this is the interoperability standard. Worth mapping to if aiming for any research credibility or clinical adoption (§4 of brief.md — out of scope for now).

### Lumbar Spine MRI Datasets (Mendeley Data)
- **URL:** https://data.mendeley.com/datasets/k57fr854j2/2 (515 patients) · https://data.mendeley.com/datasets/kr8ttxsbb8/2 (500 stenosis patients)
- **What:** Anonymized clinical MRI with expert radiologist annotations; multi-disorder classification (stenosis, disc herniation, spondylolisthesis).
- **Access:** Mendeley Data — free download.
- **Why it matters:** Structural imaging correlate. If Throughline eventually collects structural diagnoses from users (disc level, degree of herniation), these datasets let you test whether gait/ODI signatures differ by structural pathology — addressing §12.4 (discriminant validity) at a deeper level.

---

## Key gap this project fills

No public dataset directly correlates consumer-device gait metrics (Apple Health walking speed/asymmetry) with longitudinal ODI/MODQ scores. The Patient Trajectory Subgrouping dataset is the closest — weekly PRO tracking at scale — but has no wearable component. Throughline's validated R²=0.69 / block-test r=0.94 on a real instrumented episode is genuinely novel in this space.
