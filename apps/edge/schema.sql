-- KaanKhol D1 schema
-- Run: wrangler d1 execute kaankhol --file=schema.sql

CREATE TABLE IF NOT EXISTS station_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_code TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  ip_hash TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_station ON station_scores(station_code);
CREATE INDEX IF NOT EXISTS idx_ip_hash ON station_scores(ip_hash);

-- STT rate-limiting table
CREATE TABLE IF NOT EXISTS stt_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  call_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stt_ip_date ON stt_calls(ip_hash, call_date);

-- Seed sample data (labelled is_sample=1; never real passenger data)
INSERT OR IGNORE INTO station_scores (station_code, score, ip_hash, is_sample, created_at) VALUES
  ('SBC',  78, 'sample', 1, datetime('now')),
  ('NDLS', 65, 'sample', 1, datetime('now')),
  ('MAS',  59, 'sample', 1, datetime('now')),
  ('BCT',  52, 'sample', 1, datetime('now')),
  ('HYB',  71, 'sample', 1, datetime('now'));
