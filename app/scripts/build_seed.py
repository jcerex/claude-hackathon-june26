#!/usr/bin/env python3
"""Build app/data/seed.json from the validated artifacts in the repo root
(daily_signals.csv, calibration.json, modq_items.csv) + known surveys/events.
These inputs are personal health data and are git-ignored; the seed it produces is too."""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))   # claude-hackathon/
OUT = os.path.join(HERE, "..", "data", "seed.json")

def fnum(v):
    try: return float(v)
    except (TypeError, ValueError): return None
def inum(v):
    try: return int(float(v))
    except (TypeError, ValueError): return None

COLMAP = {
    "WalkingSpeed": "walking_speed", "WalkingAsymmetryPercentage": "asymmetry",
    "WalkingDoubleSupportPercentage": "double_support", "AppleWalkingSteadiness": "steadiness",
    "StepCount": "steps", "DistanceWalkingRunning": "distance_km", "FlightsClimbed": "flights",
}
daily = []
with open(os.path.join(ROOT, "daily_signals.csv")) as f:
    for r in csv.DictReader(f):
        row = {"date": r["date"]}
        for src, dst in COLMAP.items():
            row[dst] = inum(r.get(src, "")) if dst in ("steps", "flights") else fnum(r.get(src, ""))
        daily.append(row)

# prefer the enriched timeline from brain.py (forecast/risk/narration); else index-only
tl_path = os.path.join(HERE, "..", "data", "timeline.json")
if os.path.exists(tl_path):
    timeline = json.load(open(tl_path))
else:
    cal = json.load(open(os.path.join(ROOT, "calibration.json")))
    timeline = [{"date": d["date"], "index_value": d["pred"]} for d in cal.get("daily", [])]

# merge optional connector outputs (weather backfill, whoop forward) into daily rows
def _load(name):
    p = os.path.join(HERE, "..", "data", name)
    return json.load(open(p)) if os.path.exists(p) else {}
weather, whoop = _load("weather.json"), _load("whoop.json")
for row in daily:
    w = weather.get(row["date"], {})
    row["pressure_hpa"] = w.get("pressure_hpa"); row["pressure_range"] = w.get("pressure_range"); row["temp_c"] = w.get("temp_c")
    k = whoop.get(row["date"], {})
    row["hrv"] = k.get("hrv"); row["resting_hr"] = k.get("resting_hr")
    row["sleep_hours"] = k.get("sleep_hours"); row["recovery_score"] = k.get("recovery_score")

TOT = [("2025-06-28", 82), ("2025-07-15", 80), ("2025-07-29", 70), ("2025-08-04", 58),
       ("2025-08-11", 46), ("2025-08-18", 38), ("2025-08-21", 68), ("2025-08-25", 70),
       ("2025-08-29", 82), ("2025-09-06", 78), ("2025-09-08", 48), ("2025-09-10", 34),
       ("2025-09-22", 20), ("2025-10-01", 12)]
surveys = [{"id": "s-" + d, "date": d, "modq_total": v, "source": "self"} for d, v in TOT]

items = []
with open(os.path.join(ROOT, "modq_items.csv")) as f:
    for r in csv.DictReader(f):
        items.append({"survey_id": "s-" + r["date"], "item": r["questionId"], "value": int(r["value"])})

events = [
    {"id": "e1", "date": "2025-05-27", "title": "United 324 SYD->SFO (long-haul)", "kind": "exposure"},
    {"id": "e2", "date": "2025-06-27", "title": "ER - back & leg pain (onset)", "kind": "clinical"},
    {"id": "e3", "date": "2025-06-28", "title": "Cairns trip begins", "kind": "exposure"},
    {"id": "e4", "date": "2025-07-15", "title": "Started treatment, Dr Lowe", "kind": "clinical"},
    {"id": "e5", "date": "2025-08-12", "title": "Bad massage + overwalking", "kind": "clinical"},
    {"id": "e6", "date": "2025-08-22", "title": "Epidural steroid injection", "kind": "clinical"},
    {"id": "e7", "date": "2025-09-03", "title": "1am ED visit", "kind": "clinical"},
    {"id": "e8", "date": "2025-09-07", "title": "Pain gone, foot tingling", "kind": "clinical"},
]

os.makedirs(os.path.join(HERE, "..", "data"), exist_ok=True)
with open(OUT, "w") as f:
    json.dump({"daily_signals": daily, "surveys": surveys, "survey_items": items,
               "events": events, "timeline": timeline}, f)
print(f"wrote {OUT}: {len(daily)} signal-days, {len(surveys)} surveys, "
      f"{len(items)} items, {len(events)} events, {len(timeline)} timeline-days")
