#!/usr/bin/env python3
"""The (deterministic) brain — enrich the timeline with trend, turning points, a
short-horizon forecast band, and a leading-signal risk read. Numbers are computed
here (deterministic, anti-hallucination) with a template narration fallback; the
Opus narration + adversarial validation are layered on by brain.workflow.js.

Reads ../../calibration.json, ../../daily_signals.csv, ../data/weather.json.
Writes ../data/timeline.json (consumed by build_seed.py).
"""
import csv, json, os, statistics as st
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
DATA = os.path.join(HERE, "..", "data")

idx = {d["date"]: d["pred"] for d in json.load(open(os.path.join(ROOT, "calibration.json")))["daily"]}
dates = sorted(idx)

steps = {}
with open(os.path.join(ROOT, "daily_signals.csv")) as f:
    for r in csv.DictReader(f):
        try: steps[r["date"]] = float(r["StepCount"])
        except (KeyError, ValueError): pass

wpath = os.path.join(DATA, "weather.json")
weather = json.load(open(wpath)) if os.path.exists(wpath) else {}

EXPOSURE = {"2025-05-27", "2025-06-28"}   # logged exposure events (long-haul, Cairns)

def around(date, lo, hi):
    base = datetime.strptime(date, "%Y-%m-%d").date()
    return [(base + timedelta(days=k)).isoformat() for k in range(lo, hi + 1)]

rows = []
for i, dt in enumerate(dates):
    cur = idx[dt]
    win = [idx[x] for x in dates[max(0, i - 6):i + 1]]
    slope = (win[-1] - win[0]) / max(1, len(win) - 1)            # per-day, index higher = worse
    trend = "worsening" if slope > 0.8 else ("improving" if slope < -0.8 else "plateau")

    look = [idx[x] for x in dates[max(0, i - 10):i + 1]]
    turning = None
    if max(look) >= 50 and cur <= max(look) - 15 and trend != "worsening":
        turning = "past_worst"
    if i >= 5 and cur - min(idx[x] for x in dates[i - 5:i]) >= 18 and trend == "worsening":
        turning = "relapse_onset"

    horizon = 14
    fc = max(0.0, min(100.0, cur + slope * horizon))
    half = min(40.0, 10 + abs(slope) * horizon * 0.8 + 8)
    flo, fhi = max(0.0, fc - half), min(100.0, fc + half)

    flags = []
    s_now = steps.get(dt)
    s_hist = [steps[x] for x in dates[max(0, i - 14):i] if x in steps]
    if s_now and s_hist and st.median(s_hist) > 0 and s_now > 1.7 * st.median(s_hist):
        flags.append("over_exertion")
    if any(x in EXPOSURE for x in around(dt, 0, 2)):
        flags.append("high_exposure")
    pr = (weather.get(dt) or {}).get("pressure_range")
    if pr and pr >= 12:
        flags.append("pressure_swing")
    risk = round(min(1.0, 0.5 * ("over_exertion" in flags) + 0.3 * ("high_exposure" in flags) + 0.25 * ("pressure_swing" in flags)), 2)

    band = "minimal" if cur < 20 else "moderate" if cur < 41 else "severe" if cur < 61 else "crippling"
    tphrase = {"improving": "function improving", "worsening": "function sliding", "plateau": "holding steady"}[trend]
    narr = f"Estimated function in the {band} band; 7-day trend {tphrase}."
    if turning == "past_worst": narr += " Looks like you're past the worst of this episode."
    if turning == "relapse_onset": narr += " This looks like a fresh decline — ease off and watch it."
    if "over_exertion" in flags: narr += " You went well above your recent baseline — pace it."
    narr += " (A trend, not a precise score.)"

    rows.append({
        "date": dt, "index_value": round(cur, 1),
        "band_low": round(max(0, cur - 8), 1), "band_high": round(min(100, cur + 8), 1),
        "forecast_value": round(fc, 1), "forecast_low": round(flo, 1), "forecast_high": round(fhi, 1),
        "trend": trend, "turning_point": turning,
        "risk_score": risk, "risk_flags": json.dumps(flags), "narration": narr,
    })

os.makedirs(DATA, exist_ok=True)
json.dump(rows, open(os.path.join(DATA, "timeline.json"), "w"))
print(f"wrote timeline.json: {len(rows)} days · "
      f"{sum(1 for r in rows if r['risk_flags'] != '[]')} risk-flagged · "
      f"{sum(1 for r in rows if r['turning_point'] == 'past_worst')} past-worst · "
      f"{sum(1 for r in rows if r['turning_point'] == 'relapse_onset')} relapse-onset")
