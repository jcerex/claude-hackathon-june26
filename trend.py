#!/usr/bin/env python3
"""Read daily_signals.csv, compute weekly means of the gait signals, print a
monthly summary, and write trend.json for charting."""
import csv, json
from collections import defaultdict
from datetime import datetime, timedelta

COLS = ["WalkingSpeed", "WalkingAsymmetryPercentage",
        "WalkingDoubleSupportPercentage", "StepCount"]

rows = list(csv.DictReader(open("daily_signals.csv")))

def monday(dstr):
    d = datetime.strptime(dstr, "%Y-%m-%d").date()
    return (d - timedelta(days=d.weekday())).isoformat()

weekly  = defaultdict(lambda: defaultdict(list))
monthly = defaultdict(lambda: defaultdict(list))
for r in rows:
    d = r["date"]; wk = monday(d); mo = d[:7]
    for c in COLS:
        v = r.get(c, "")
        if v not in ("", None):
            try:
                f = float(v); weekly[wk][c].append(f); monthly[mo][c].append(f)
            except ValueError:
                pass

series = []
for wk in sorted(weekly):
    rec = {"week": wk}
    for c in COLS:
        vs = weekly[wk][c]
        rec[c] = round(sum(vs) / len(vs), 3) if vs else None
    series.append(rec)

json.dump({"flareStart": "2025-05-01", "flareEnd": "2025-09-30", "series": series},
          open("trend.json", "w"))

print(f"{'month':<9}{'speed':>7}{'asym%':>7}{'dsup%':>7}{'steps/day':>11}")
for mo in sorted(monthly):
    def m(c):
        vs = monthly[mo][c]
        return sum(vs) / len(vs) if vs else float("nan")
    flare = "  <-- flare" if "2025-05" <= mo <= "2025-09" else ""
    print(f"{mo:<9}{m('WalkingSpeed'):7.2f}{m('WalkingAsymmetryPercentage'):7.2f}"
          f"{m('WalkingDoubleSupportPercentage'):7.2f}{m('StepCount'):11.0f}{flare}")
print(f"\nweeks: {len(series)} -> trend.json")
