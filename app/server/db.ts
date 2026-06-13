import Database from 'better-sqlite3'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const DB_PATH = process.env.DATABASE_PATH || join(root, 'dev.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'))

const TL_KEYS = ['index_value', 'band_low', 'band_high', 'forecast_value', 'forecast_low', 'forecast_high', 'trend', 'turning_point', 'risk_score', 'risk_flags', 'narration', 'narration_pass', 'narration_score']

const seedPath = process.env.SEED_PATH || join(root, 'data', 'seed.json')
const n = (db.prepare('SELECT COUNT(*) AS n FROM daily_signals').get() as { n: number }).n
if (existsSync(seedPath)) {
  if (n === 0) {
    seedFrom(seedPath)
    console.log(`[db] seeded from ${seedPath}`)
  } else {
    // `timeline` is precomputed brain output (not user data), so refresh it from the
    // seed on every boot — a re-run of brain.py then lands on the next deploy without
    // wiping surveys/signals/events (which are seeded once, above).
    const data = JSON.parse(readFileSync(seedPath, 'utf8'))
    if ((data.timeline ?? []).length) {
      db.transaction(() => {
        db.prepare('DELETE FROM timeline').run()
        insertTimeline(data.timeline)
      })()
      console.log(`[db] refreshed timeline (${data.timeline.length} days) from ${seedPath}`)
    }
  }
} else if (n === 0) {
  console.warn(`[db] empty and no seed found at ${seedPath} — run: pnpm seed`)
}

function fill(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = { ...obj }
  for (const k of keys) if (!(k in out)) out[k] = null
  return out
}

function insertTimeline(rows: Record<string, unknown>[]) {
  const tl = db.prepare(`INSERT OR REPLACE INTO timeline (date,${TL_KEYS.join(',')}) VALUES (@date,${TL_KEYS.map((k) => '@' + k).join(',')})`)
  for (const r of rows) tl.run(fill(r, TL_KEYS))
}

function seedFrom(path: string) {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const sigKeys = ['walking_speed', 'asymmetry', 'double_support', 'steadiness', 'steps', 'distance_km', 'flights', 'pressure_hpa', 'pressure_range', 'temp_c', 'hrv', 'resting_hr', 'sleep_hours', 'recovery_score']
  const sig = db.prepare(`INSERT OR REPLACE INTO daily_signals (date,${sigKeys.join(',')}) VALUES (@date,${sigKeys.map((k) => '@' + k).join(',')})`)
  const sv = db.prepare(`INSERT OR REPLACE INTO surveys (id,date,modq_total,source) VALUES (@id,@date,@modq_total,@source)`)
  const it = db.prepare(`INSERT OR REPLACE INTO survey_items (survey_id,item,value) VALUES (@survey_id,@item,@value)`)
  const ev = db.prepare(`INSERT OR REPLACE INTO events (id,date,title,kind) VALUES (@id,@date,@title,@kind)`)
  db.transaction(() => {
    for (const r of data.daily_signals ?? []) sig.run(fill(r, sigKeys))
    for (const r of data.surveys ?? []) sv.run({ source: 'self', ...r })
    for (const r of data.survey_items ?? []) it.run(r)
    for (const r of data.events ?? []) ev.run({ kind: 'clinical', ...r })
    insertTimeline(data.timeline ?? [])
  })()
}
