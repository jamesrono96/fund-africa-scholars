-- Scholarship discovery registry and human-review queue.
-- Apply after the initial schema and earlier migrations.
PRAGMA foreign_keys = ON;

ALTER TABLE scholarship_sources ADD COLUMN source_type TEXT NOT NULL DEFAULT 'university';
ALTER TABLE scholarship_sources ADD COLUMN country TEXT;
ALTER TABLE scholarship_sources ADD COLUMN check_frequency_days INTEGER NOT NULL DEFAULT 14;
ALTER TABLE scholarship_sources ADD COLUMN notes TEXT;
ALTER TABLE scholarship_sources ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES scholarship_sources(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TEXT,
  completed_at TEXT,
  candidates_found INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_source_created
  ON discovery_runs(source_id, created_at);

CREATE TABLE IF NOT EXISTS scholarship_candidates (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES scholarship_sources(id) ON DELETE SET NULL,
  discovery_run_id TEXT REFERENCES discovery_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  destination_country TEXT,
  official_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  content_fingerprint TEXT,
  summary TEXT,
  application_deadline TEXT,
  extracted_data_json TEXT NOT NULL DEFAULT '{}',
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'needs_review', 'accepted', 'rejected', 'duplicate')),
  review_notes TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  scholarship_id TEXT REFERENCES scholarships(id) ON DELETE SET NULL,
  discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(normalized_url)
);
CREATE INDEX IF NOT EXISTS idx_candidates_review_discovered
  ON scholarship_candidates(review_status, discovered_at);
CREATE INDEX IF NOT EXISTS idx_candidates_source
  ON scholarship_candidates(source_id);
CREATE INDEX IF NOT EXISTS idx_candidates_fingerprint
  ON scholarship_candidates(content_fingerprint);
