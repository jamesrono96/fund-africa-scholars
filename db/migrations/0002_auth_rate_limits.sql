-- Authentication support and abuse controls.
-- Apply this migration after the initial db/schema.sql.
CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at);
