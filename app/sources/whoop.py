#!/usr/bin/env python3
"""Connector: Whoop (forward-looking recovery axis — sleep, HRV, resting HR, recovery).

Whoop has NO data from the 2025 episode (no device then), so this enriches
*current/future* tracking and the onset-risk work, not the historical demo.

Auth: set WHOOP_ACCESS_TOKEN in the environment (never commit it / never paste in chat).
  1. developer.whoop.com -> create an app (OAuth2).
  2. Run the OAuth flow once to get an access token (scopes: read:recovery read:sleep read:cycles).
     Personal access tokens expire (~1h); for ongoing sync, store the refresh token and refresh.
Then:  WHOOP_ACCESS_TOKEN=... python3 sources/whoop.py
Writes app/data/whoop.json {date: {hrv, resting_hr, sleep_hours, recovery_score}} -> merged by build_seed.py.
"""
import json, os, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "whoop.json")
BASE = "https://api.prod.whoop.com/developer"
TOKEN = os.environ.get("WHOOP_ACCESS_TOKEN")

def get(path, params):
    url = f"{BASE}{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def paged(path, params):
    out, token = [], None
    while True:
        if token:
            params = {**params, "nextToken": token}
        page = get(path, params)
        out += page.get("records", [])
        token = page.get("next_token")
        if not token:
            return out

def main():
    if not TOKEN:
        raise SystemExit("WHOOP_ACCESS_TOKEN not set — see this file's docstring. "
                         "(Skipped; the app runs fine without Whoop data.)")
    rng = {"start": "2025-01-01T00:00:00.000Z", "limit": 25}
    days = {}
    for r in paged("/v1/recovery", rng):
        d = (r.get("created_at") or "")[:10]
        s = r.get("score") or {}
        if d:
            days.setdefault(d, {})
            days[d]["hrv"] = s.get("hrv_rmssd_milli")
            days[d]["resting_hr"] = s.get("resting_heart_rate")
            days[d]["recovery_score"] = s.get("recovery_score")
    for r in paged("/v1/activity/sleep", rng):
        d = (r.get("end") or r.get("created_at") or "")[:10]
        st, en = r.get("start"), r.get("end")
        if d and st and en:
            from datetime import datetime
            fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
            try:
                hrs = (datetime.strptime(en, fmt) - datetime.strptime(st, fmt)).total_seconds() / 3600
                days.setdefault(d, {})["sleep_hours"] = round(hrs, 2)
            except ValueError:
                pass
    with open(OUT, "w") as f:
        json.dump(days, f)
    print(f"wrote {OUT}: {len(days)} days")

if __name__ == "__main__":
    main()
