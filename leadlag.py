#!/usr/bin/env python3
"""Lead/lag: does gait deterioration precede the survey-confirmed worsening?
Daily view around onset + relapse, plus lag correlation."""
import csv, statistics as st
from datetime import datetime, timedelta

rows = {r["date"]: r for r in csv.DictReader(open("daily_signals.csv"))}
def fget(d, c):
    try: return float(rows.get(d, {}).get(c, ""))
    except ValueError: return None
def wmean(date, c, w=3):
    d0 = datetime.strptime(date, "%Y-%m-%d").date()
    vs = [fget((d0+timedelta(days=k)).isoformat(), c) for k in range(-w, w+1)]
    vs = [v for v in vs if v is not None]
    return st.mean(vs) if vs else None
def dd(d): return datetime.strptime(d, "%Y-%m-%d").date()

TOT = {"2025-06-28":82,"2025-07-15":80,"2025-07-29":70,"2025-08-04":58,"2025-08-11":46,
       "2025-08-18":38,"2025-08-21":68,"2025-08-25":70,"2025-08-29":82,"2025-09-06":78,
       "2025-09-08":48,"2025-09-10":34,"2025-09-22":20,"2025-10-01":12}
FE = [("WalkingSpeed", -1), ("StepCount", -1)]
win = sorted(d for d in rows if "2025-05-01" <= d <= "2025-10-15")
zp = {c: (st.mean([fget(d,c) for d in win if fget(d,c) is not None]),
          st.pstdev([fget(d,c) for d in win if fget(d,c) is not None]) or 1) for c,_ in FE}
def comp(date):
    zs = []
    for c, s in FE:
        v = wmean(date, c)
        if v is not None: mu, sd = zp[c]; zs.append(s*(v-mu)/sd)
    return st.mean(zs) if zs else None
X = [comp(d) for d in TOT]; Y = list(TOT.values())
mx, my = st.mean(X), st.mean(Y)
b1 = sum((X[i]-mx)*(Y[i]-my) for i in range(len(X)))/sum((x-mx)**2 for x in X); b0 = my-b1*mx
def pmodq(d):
    c = comp(d); return None if c is None else max(0, min(100, b0+b1*c))

def show(s, e, title):
    print(f"\n=== {title} ===")
    print("  date         speed  steps   estMODQ   survey")
    d = dd(s)
    while d <= dd(e):
        x = d.isoformat(); sp = fget(x,"WalkingSpeed"); stp = fget(x,"StepCount"); pm = pmodq(x)
        print(f"  {x}   {('%4.2f'%sp) if sp is not None else '  - '}  {('%5.0f'%stp) if stp is not None else '   - '}"
              f"   {('%5.1f'%pm) if pm is not None else '  -  '}   {('MODQ '+str(TOT[x])) if x in TOT else ''}")
        d += timedelta(days=1)

show("2025-06-09", "2025-06-30", "ONSET window (ER 27 Jun)")
show("2025-08-06", "2025-08-26", "RELAPSE window (massage+overwalking 12 Aug; survey jumps 18->21 Aug)")

def pearson(xs, ys):
    n = len(xs); ax, ay = st.mean(xs), st.mean(ys)
    den = (sum((x-ax)**2 for x in xs)*sum((y-ay)**2 for y in ys))**0.5
    return sum((xs[i]-ax)*(ys[i]-ay) for i in range(n))/den if den else float("nan")
print("\n=== lag correlation: MODQ(survey) vs gait composite shifted k days  (k<0 = gait BEFORE survey = leads) ===")
sd = sorted(TOT)
for k in [-7,-5,-3,0,3,5,7]:
    xs, ys = [], []
    for d in sd:
        c = comp((dd(d)+timedelta(days=k)).isoformat())
        if c is not None: xs.append(c); ys.append(TOT[d])
    print(f"  k={k:+d}d   r={pearson(xs,ys):+.2f}")
