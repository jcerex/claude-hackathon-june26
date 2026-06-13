#!/usr/bin/env python3
"""Stream an Apple Health export.xml (no full read), report coverage for the
key Throughline signals in a date window, and emit a tidy daily CSV.

Usage:
  python3 parse_health.py [export.xml] [START YYYY-MM-DD] [END YYYY-MM-DD]
Defaults: ./apple_health_export/export.xml  2025-05-01  2025-09-30
"""
import re, sys, csv
from collections import defaultdict
from datetime import datetime

path  = sys.argv[1] if len(sys.argv) > 1 else "apple_health_export/export.xml"
start = sys.argv[2] if len(sys.argv) > 2 else "2025-05-01"
end   = sys.argv[3] if len(sys.argv) > 3 else "2025-09-30"
years = {str(y) for y in range(int(start[:4]), int(end[:4]) + 1)}

# short-name -> aggregation rule
SUM   = {"StepCount", "DistanceWalkingRunning", "FlightsClimbed"}
MEAN  = {"WalkingSpeed", "WalkingAsymmetryPercentage", "WalkingDoubleSupportPercentage",
         "AppleWalkingSteadiness", "RestingHeartRate", "HeartRateVariabilitySDNN"}
SLEEP = "SleepAnalysis"            # special: asleep hours/night
TARGETS = SUM | MEAN | {SLEEP}

re_type  = re.compile(r'type="HK\w*?Identifier(\w+)"')
re_start = re.compile(r'startDate="([^"]+)"')
re_end   = re.compile(r'endDate="([^"]+)"')
re_val   = re.compile(r'value="([^"]*)"')

# (type, date) -> list of values ; sleep -> (type,date) -> asleep seconds
vals  = defaultdict(list)
sleep = defaultdict(float)
seen_any_2025 = 0

def day_of(s):           # "2025-05-01 08:00:00 -0700" -> "2025-05-01"
    return s[:10]

with open(path, "r", encoding="utf-8", errors="replace") as f:
    for line in f:
        if "<Record " not in line or "TypeIdentifier" not in line:
            continue
        if not any(f'startDate="{y}' in line for y in years):   # fast year prune
            continue
        mt = re_type.search(line)
        if not mt or mt.group(1) not in TARGETS:
            continue
        ms = re_start.search(line)
        if not ms:
            continue
        d = day_of(ms.group(1))
        if d[:4] == "2025":
            seen_any_2025 += 1
        if not (start <= d <= end):
            continue
        t = mt.group(1)
        if t == SLEEP:
            mv = re_val.search(line); me = re_end.search(line)
            if mv and me and "Asleep" in mv.group(1):
                try:
                    fmt = "%Y-%m-%d %H:%M:%S %z"
                    dt0 = datetime.strptime(ms.group(1), fmt)
                    dt1 = datetime.strptime(me.group(1), fmt)
                    sleep[(t, d)] += (dt1 - dt0).total_seconds()
                except ValueError:
                    pass
        else:
            mv = re_val.search(line)
            if mv:
                try: vals[(t, d)].append(float(mv.group(1)))
                except ValueError: pass

# ---- daily aggregation ----
days = sorted({d for (_, d) in list(vals) + list(sleep)})
types = sorted(TARGETS)
daily = defaultdict(dict)   # date -> {type: agg}
for (t, d), vs in vals.items():
    daily[d][t] = round(sum(vs), 2) if t in SUM else round(sum(vs) / len(vs), 3)
for (t, d), secs in sleep.items():
    daily[d][t] = round(secs / 3600.0, 2)   # asleep hours

# ---- coverage report ----
print(f"\nWindow {start} .. {end}   |   total 2025 records scanned in-window-or-earlier-month: {seen_any_2025}")
print(f"Days with ANY tracked signal in window: {len(days)}"
      + (f"   ({days[0]} .. {days[-1]})" if days else "   (NONE)"))
print("\n  signal                          days  records   first        last")
print("  " + "-" * 70)
for t in types:
    keys = [k for k in (list(vals) + list(sleep)) if k[0] == t]
    ds = sorted({k[1] for k in keys})
    n = sum(len(vals[(t, d)]) for d in ds) if t != SLEEP else len([k for k in sleep if k[0] == t])
    flag = "  OK" if len(ds) >= 30 else ("  ~" if ds else "  XX")
    print(f"  {t:<30} {len(ds):>5} {n:>8}   {ds[0] if ds else '-':<11}  {ds[-1] if ds else '-':<11}{flag}")

# ---- per-month days-with-data (does the flare window have coverage?) ----
print("\n  days-with-data by month:")
for t in types:
    ds = sorted({k[1] for k in (list(vals)+list(sleep)) if k[0] == t})
    bym = defaultdict(int)
    for d in ds: bym[d[:7]] += 1
    months = " ".join(f"{m[5:]}:{c:>2}" for m, c in sorted(bym.items()))
    print(f"  {t:<30} {months or '-'}")

# ---- write tidy CSV ----
out = "daily_signals.csv"
with open(out, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["date"] + types)
    for d in days:
        w.writerow([d] + [daily[d].get(t, "") for t in types])
print(f"\nWrote {out}  ({len(days)} rows)\n")
