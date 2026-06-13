#!/usr/bin/env python3
"""Methodology checks: (1) does gait predict NON-mobility MODQ items (circularity test),
(2) forward validation — predict each survey from past surveys only."""
import csv, statistics as st
from datetime import datetime, timedelta

items = {}
for r in csv.DictReader(open("modq_items.csv")):
    items.setdefault(r["date"], {})[r["questionId"]] = int(r["value"])
dates = sorted(items)

TOT = {"2025-06-28":82,"2025-07-15":80,"2025-07-29":70,"2025-08-04":58,"2025-08-11":46,
       "2025-08-18":38,"2025-08-21":68,"2025-08-25":70,"2025-08-29":82,"2025-09-06":78,
       "2025-09-08":48,"2025-09-10":34,"2025-09-22":20,"2025-10-01":12}

rows = {r["date"]: r for r in csv.DictReader(open("daily_signals.csv"))}
def fget(d, c):
    try: return float(rows.get(d, {}).get(c, ""))
    except ValueError: return None
def wmean(date, c, w=3):
    d0 = datetime.strptime(date, "%Y-%m-%d").date()
    vs = [fget((d0+timedelta(days=k)).isoformat(), c) for k in range(-w, w+1)]
    vs = [v for v in vs if v is not None]
    return st.mean(vs) if vs else None
def pearson(xs, ys):
    n = len(xs); mx, my = st.mean(xs), st.mean(ys)
    den = (sum((x-mx)**2 for x in xs)*sum((y-my)**2 for y in ys))**0.5
    return (sum((xs[i]-mx)*(ys[i]-my) for i in range(n))/den) if den else float("nan")

FE = [("WalkingSpeed", -1), ("StepCount", -1)]
win = sorted(d for d in rows if "2025-05-01" <= d <= "2025-10-15")
zp = {c: (st.mean([fget(d,c) for d in win if fget(d,c) is not None]),
          st.pstdev([fget(d,c) for d in win if fget(d,c) is not None]) or 1) for c,_ in FE}
def comp(date):
    zs = []
    for c, s in FE:
        v = wmean(date, c)
        if v is not None:
            mu, sd = zp[c]; zs.append(s*(v-mu)/sd)
    return st.mean(zs) if zs else None
gait = [comp(d) for d in dates]

print("=== TEST 1 — item-level: gait severity vs each MODQ item (Pearson r over 14 surveys) ===")
print("    mobility items expected to correlate (partly tautology); pain & sleep are the real test:\n")
for it in ["walking","sitting","standing","traveling","social_life","employment_homemaking",
           "lifting","personal_care","pain_intensity","sleeping"]:
    ys = [items[d].get(it) for d in dates]
    pairs = [(gait[i], ys[i]) for i in range(len(dates)) if ys[i] is not None and gait[i] is not None]
    xs = [p[0] for p in pairs]; yy = [p[1] for p in pairs]
    flag = "  <- NON-mobility" if it in ("pain_intensity","sleeping") else ""
    print(f"  {it:24} r={pearson(xs,yy):+.2f}   (item range {min(yy)}-{max(yy)}){flag}")

def fitpred(train, target):
    X = [comp(d) for d in train]; Y = [TOT[d] for d in train]
    n = len(X); mx, my = st.mean(X), st.mean(Y)
    den = sum((x-mx)**2 for x in X)
    if den == 0: return my
    b1 = sum((X[i]-mx)*(Y[i]-my) for i in range(n))/den
    return max(0, min(100, (my-b1*mx) + b1*comp(target)))

print("\n=== TEST 2 — forward validation: train on PAST surveys only, predict the next one ===")
errs = []
for i in range(3, len(dates)):
    p = fitpred(dates[:i], dates[i]); a = TOT[dates[i]]
    errs.append(abs(p-a))
    print(f"  {dates[i]}  actual {a:>3}  predicted {p:5.1f}  err {abs(p-a):4.1f}")
print(f"  forward (prospective) MAE = {st.mean(errs):.1f}   vs in-sample 9.1, LOO 10.5")

tr = [d for d in dates if d <= "2025-08-18"]; te = [d for d in dates if d > "2025-08-18"]
pe = [abs(fitpred(tr, d)-TOT[d]) for d in te]
fr = pearson([fitpred(tr, d) for d in te], [TOT[d] for d in te])
print(f"\n=== block test — predict the relapse+recovery COLD (train {tr[0]}..{tr[-1]}, {len(tr)} pts) ===")
for d in te:
    print(f"  {d}  actual {TOT[d]:>3}  predicted {fitpred(tr,d):5.1f}")
print(f"  test MAE={st.mean(pe):.1f}  test r={fr:+.2f}")
