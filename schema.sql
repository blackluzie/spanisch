-- D1-Schema – Spanisch-Lern-App

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL,
  username_lc  TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#ef4444',
  avatar       TEXT NOT NULL DEFAULT '😊',
  pin_hash     TEXT NOT NULL,
  pin_salt     TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  category   TEXT NOT NULL,
  mode       TEXT NOT NULL,   -- 'cards' | 'quiz'
  points     INTEGER NOT NULL DEFAULT 0,
  correct    INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 0,
  played_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_user   ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_played ON scores(played_at);

CREATE TABLE IF NOT EXISTS streaks (
  user_id        TEXT PRIMARY KEY,
  last_date      TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak    INTEGER NOT NULL DEFAULT 0
);
