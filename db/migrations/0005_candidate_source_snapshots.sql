-- Records each manual fetch of a candidate's official page.
-- A changed page is a review signal, never proof that scholarship facts changed.
CREATE TABLE IF NOT EXISTS candidate_source_snapshots (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES scholarship_candidates(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES scholarship_sources(id) ON DELETE SET NULL,
  official_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  page_title TEXT,
  description TEXT,
  body_excerpt TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_detected INTEGER NOT NULL DEFAULT 0 CHECK (change_detected IN (0,1)),
  previous_snapshot_id TEXT REFERENCES candidate_source_snapshots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_snapshots_latest
  ON candidate_source_snapshots(candidate_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_snapshots_changes
  ON candidate_source_snapshots(change_detected, fetched_at DESC);
