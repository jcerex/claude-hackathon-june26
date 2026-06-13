PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Raw passive signals, one row per day (parsed from Apple Health export)
CREATE TABLE IF NOT EXISTS daily_signals (
  date            TEXT PRIMARY KEY,   -- YYYY-MM-DD
  walking_speed   REAL,               -- km/h, daily mean
  asymmetry       REAL,               -- 0..1 fraction, daily mean
  double_support  REAL,               -- 0..1 fraction, daily mean
  steadiness      REAL,               -- %, sparse
  steps           INTEGER,            -- daily total
  distance_km     REAL,
  flights         INTEGER,
  -- weather (Open-Meteo, backfilled onto the episode)
  pressure_hpa    REAL,
  pressure_range  REAL,               -- intraday swing ~ front passage
  temp_c          REAL,
  -- recovery (Whoop, forward-looking; null in the 2025 episode)
  hrv             REAL,
  resting_hr      REAL,
  sleep_hours     REAL,
  recovery_score  REAL
);

-- Ground-truth MODQ surveys
CREATE TABLE IF NOT EXISTS surveys (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,          -- YYYY-MM-DD
  modq_total  REAL NOT NULL,          -- 0..100
  source      TEXT DEFAULT 'self'     -- self | reconstructed
);
CREATE INDEX IF NOT EXISTS idx_surveys_date ON surveys(date);

-- Per-item MODQ responses (0..5), for analysis + display
CREATE TABLE IF NOT EXISTS survey_items (
  survey_id   TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  item        TEXT NOT NULL,          -- pain_intensity, walking, sleeping, ...
  value       INTEGER NOT NULL,       -- 0..5
  PRIMARY KEY (survey_id, item)
);

-- Clinical + exposure events
CREATE TABLE IF NOT EXISTS events (
  id     TEXT PRIMARY KEY,
  date   TEXT NOT NULL,
  title  TEXT NOT NULL,
  kind   TEXT NOT NULL DEFAULT 'clinical'  -- clinical | exposure | note
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Precomputed companion output, one row per day (the "brain" writes this; the UI reads it)
CREATE TABLE IF NOT EXISTS timeline (
  date            TEXT PRIMARY KEY,
  index_value     REAL,     -- tracked recovery index (0..100, higher = worse), calibrated to MODQ total
  band_low        REAL,     -- nowcast uncertainty band
  band_high       REAL,
  forecast_value  REAL,     -- short-horizon projection (nullable)
  forecast_low    REAL,
  forecast_high   REAL,
  trend           TEXT,      -- improving | plateau | worsening
  turning_point   TEXT,      -- null | past_worst | relapse_onset
  risk_score      REAL,      -- 0..1 flare / over-exertion risk (leading signals)
  risk_flags      TEXT,      -- JSON array, e.g. ["over_exertion","high_exposure"]
  narration       TEXT,      -- Opus daily read (counter-catastrophizing, honest)
  narration_pass  INTEGER,   -- 1/0 passed the YMYL honesty rubric
  narration_score INTEGER    -- rubric score 0..100
);

-- Calibration params + provenance, so the app (and the future iOS port) recalibrate identically
CREATE TABLE IF NOT EXISTS meta (
  key    TEXT PRIMARY KEY,
  value  TEXT
);
