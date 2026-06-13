#!/usr/bin/env python3
"""Connector: Open-Meteo historical weather (free, no auth).

Backfills daily barometric pressure + temperature for the episode window so we
can test the pressure-vs-pain covariate. The ONE external source that retro-fills
the 2025 episode. Writes app/data/weather.json -> merged into daily_signals by build_seed.py.
"""
import json, os, urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "weather.json")
LAT, LON = -33.876, 151.245        # Double Bay, Sydney (where Jamie was living)
START, END = "2025-05-01", "2025-10-15"

url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={LAT}&longitude={LON}"
       f"&start_date={START}&end_date={END}&hourly=pressure_msl,temperature_2m"
       f"&timezone=Australia%2FSydney")
h = json.load(urllib.request.urlopen(url, timeout=60))["hourly"]

byday = defaultdict(lambda: {"p": [], "t": []})
for ts, p, t in zip(h["time"], h["pressure_msl"], h["temperature_2m"]):
    d = ts[:10]
    if p is not None:
        byday[d]["p"].append(p)
    if t is not None:
        byday[d]["t"].append(t)

out = {}
for d, v in byday.items():
    p, t = v["p"], v["t"]
    out[d] = {
        "pressure_hpa": round(sum(p) / len(p), 1) if p else None,
        "pressure_range": round(max(p) - min(p), 1) if p else None,  # intraday swing ~ front passage
        "temp_c": round(sum(t) / len(t), 1) if t else None,
    }

os.makedirs(os.path.join(HERE, "..", "data"), exist_ok=True)
with open(OUT, "w") as f:
    json.dump(out, f)
print(f"wrote {OUT}: {len(out)} days ({START}..{END})")
for d in ["2025-06-26", "2025-06-27", "2025-08-12"]:
    if d in out:
        print(" ", d, out[d])
