-- Evidence-backed scholarship-level verification checklist.
CREATE TABLE IF NOT EXISTS scholarship_verification_checks (
  id TEXT PRIMARY KEY,
  scholarship_id TEXT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL CHECK (check_key IN ('official_source','current_intake','eligible_nationalities','study_level','funding_terms','application_deadline','application_route')),
  decision TEXT NOT NULL CHECK (decision IN ('confirmed','not_applicable','needs_follow_up')),
  evidence_url TEXT NOT NULL,
  evidence_excerpt TEXT NOT NULL,
  reviewer_notes TEXT NOT NULL DEFAULT '',
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scholarship_id, check_key)
);
CREATE INDEX IF NOT EXISTS idx_scholarship_verification_checks
  ON scholarship_verification_checks(scholarship_id, reviewed_at DESC);
