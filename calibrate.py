#!/usr/bin/env python3
"""Calibrate a passive gait-based severity index against the real MODQ scores.
Reads daily_signals.csv; MODQ ground truth pulled from the recovery_tracker DB."""
import csv, json, statistics as st
from datetime import datetime, timedelta

# MODQ total scores from recovery_tracker.surveys (pulled 2026-06-13)
MODQ = [("2025-06-28",82),("2025-07-15",80),("2025-07-29",70),("2025-08-04",58),
        ("2025-08-11",46),("2025-08-18",38),("2025-08-21",68),("2025-08-25",70),
        ("2025-08-29",82),("2025-09-06",78),("2025-09-08",48),("2025-09-10",34),
        ("2025-09-22",20),("2025-10-01",12)]
EVENTS = [("2025-06-27","ER: back & leg pain"),("2025-07-15","started Dr Lowe"),
          ("2025-08-12","bad massage + overwalking"),("2025-08-22","epidural injection"),
          ("2025-09-03","1am ED visit"),("2025-09-07","pain gone, foot tingling")]

rows = {r["date"]: r for r in csv.DictReader(open("daily_signals.csv"))}
def fget(d, col):
    try: return float(rows.get(d, {}).get(col, ""))
    except ValueError: return None
def wmean(date, col, w=3):
    d0 = datetime.strptime(date, "%Y-%m-%d").date()
    vals = [fget((d0+timedelta(days=k)).isoformat(), col) for k in range(-w, w+1)]
    vals = [v for v in vals if v is not None]
    return st.mean(vals) if vals else None

# feature, sign (+1 = higher means worse)
FEATS = [("WalkingSpeed", -1), ("StepCount", -1)]
window = sorted(d for d in rows if "2025-05-01" <= d <= "2025-10-15")
zp = {}
for col, _ in FEATS:
    vals = [fget(d, col) for d in window if fget(d, col) is not None]
    zp[col] = (st.mean(vals), st.pstdev(vals) or 1.0)
def composite(date):
    zs = []
    for col, sign in FEATS:
        v = wmean(date, col)
        if v is not None:
            mu, sd = zp[col]; zs.append(sign*(v-mu)/sd)
    return st.mean(zs) if zs else None

X, Y = [], []
for d, s in MODQ:
    c = composite(d)
    if c is not None: X.append(c); Y.append(s)
n = len(X); mx, my = st.mean(X), st.mean(Y)
b1 = sum((X[i]-mx)*(Y[i]-my) for i in range(n)) / sum((X[i]-mx)**2 for i in range(n))
b0 = my - b1*mx
pred = [b0+b1*x for x in X]
r2 = 1 - sum((Y[i]-pred[i])**2 for i in range(n)) / sum((y-my)**2 for y in Y)
mae = st.mean([abs(Y[i]-pred[i]) for i in range(n)])
loo = []
for i in range(n):
    xs = [X[j] for j in range(n) if j != i]; ys = [Y[j] for j in range(n) if j != i]
    m, mm = st.mean(xs), st.mean(ys)
    c1 = sum((xs[k]-m)*(ys[k]-mm) for k in range(len(xs))) / sum((xs[k]-m)**2 for k in range(len(xs)))
    loo.append(abs(Y[i] - ((mm-c1*m)+c1*X[i])))
loomae = st.mean(loo)

daily = [{"date": d, "pred": round(max(0, min(100, b0+b1*composite(d))), 1)}
         for d in window if composite(d) is not None]
json.dump({"daily": daily, "modq": MODQ, "events": EVENTS,
           "fit": {"r2": round(r2,3), "mae": round(mae,1), "loo_mae": round(loomae,1), "n": n}},
          open("calibration.json", "w"))

print(f"n={n}   R^2={r2:.3f}   in-sample MAE={mae:.1f}   leave-one-out MAE={loomae:.1f} (MODQ points)")
print("single-feature correlation with MODQ:")
for col, _ in FEATS:
    xs, ys = [], []
    for d, s in MODQ:
        v = wmean(d, col)
        if v is not None: xs.append(v); ys.append(s)
    m, mm = st.mean(xs), st.mean(ys)
    num = sum((xs[i]-m)*(ys[i]-mm) for i in range(len(xs)))
    den = (sum((xs[i]-m)**2 for i in range(len(xs)))*sum((ys[i]-mm)**2 for i in range(len(ys))))**0.5
    print(f"  {col:32} r={num/den:+.2f}")
print(f"daily predicted points: {len(daily)}  -> calibration.json")
