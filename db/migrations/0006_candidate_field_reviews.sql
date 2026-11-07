-- Record administrator decisions on individual extraction suggestions.
-- Decisions are append-only so later reviews do not erase earlier judgments.
CREATE TABLE IF NOT EXISTS candidate_field_reviews (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES scholarship_candidates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL CHECK (field_key IN ('funding','study_levels','eligibility','deadlines')),
  suggested_value TEXT NOT NULL,
  evidence_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_candidate_field_reviews_candidate
  ON candidate_field_reviews(candidate_id, reviewed_at DESC);
