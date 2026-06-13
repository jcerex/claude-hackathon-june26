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

const n = (db.prepare('SELECT COUNT(*) AS n FROM daily_signals').get() as { n: number }).n
if (n === 0) {
  const seedPath = process.env.SEED_PATH || join(root, 'data', 'seed.json')
  if (existsSync(seedPath)) {
    seedFrom(seedPath)
    console.log(`[db] seeded from ${seedPath}`)
  } else {
    console.warn(`[db] empty and no seed found at ${seedPath} — run: pnpm seed`)
  }
}

function fill(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = { ...obj }
  for (const k of keys) if (!(k in out)) out[k] = null
  return out
}

function seedFrom(path: string) {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const sigKeys = ['walking_speed', 'asymmetry', 'double_support', 'steadiness', 'steps', 'distance_km', 'flights', 'pressure_hpa', 'pressure_range', 'temp_c', 'hrv', 'resting_hr', 'sleep_hours', 'recovery_score']
  const tlKeys = ['index_value', 'band_low', 'band_high', 'forecast_value', 'forecast_low', 'forecast_high', 'trend', 'turning_point', 'risk_score', 'risk_flags', 'narration', 'narration_pass', 'narration_score']
  const sig = db.prepare(`INSERT OR REPLACE INTO daily_signals (date,${sigKeys.join(',')}) VALUES (@date,${sigKeys.map((k) => '@' + k).join(',')})`)
  const sv = db.prepare(`INSERT OR REPLACE INTO surveys (id,date,modq_total,source) VALUES (@id,@date,@modq_total,@source)`)
  const it = db.prepare(`INSERT OR REPLACE INTO survey_items (survey_id,item,value) VALUES (@survey_id,@item,@value)`)
  const ev = db.prepare(`INSERT OR REPLACE INTO events (id,date,title,kind) VALUES (@id,@date,@title,@kind)`)
  const tl = db.prepare(`INSERT OR REPLACE INTO timeline (date,index_value,band_low,band_high,forecast_value,forecast_low,forecast_high,trend,turning_point,risk_score,risk_flags,narration,narration_pass,narration_score)
    VALUES (@date,@index_value,@band_low,@band_high,@forecast_value,@forecast_low,@forecast_high,@trend,@turning_point,@risk_score,@risk_flags,@narration,@narration_pass,@narration_score)`)
  db.transaction(() => {
    for (const r of data.daily_signals ?? []) sig.run(fill(r, sigKeys))
    for (const r of data.surveys ?? []) sv.run({ source: 'self', ...r })
    for (const r of data.survey_items ?? []) it.run(r)
    for (const r of data.events ?? []) ev.run({ kind: 'clinical', ...r })
    for (const r of data.timeline ?? []) tl.run(fill(r, tlKeys))
  })()
}
