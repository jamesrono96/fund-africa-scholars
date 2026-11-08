-- Expand field-level review decisions to include an explicit follow-up state.
-- Preserve the append-only review history from migration 0006.
PRAGMA foreign_keys = ON;

ALTER TABLE candidate_field_reviews RENAME TO candidate_field_reviews_old;
DROP INDEX IF EXISTS idx_candidate_field_reviews_candidate;

CREATE TABLE candidate_field_reviews (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES scholarship_candidates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL CHECK (field_key IN ('funding','study_levels','eligibility','deadlines')),
  suggested_value TEXT NOT NULL,
  evidence_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','needs_follow_up')),
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO candidate_field_reviews
  (id,candidate_id,field_key,suggested_value,evidence_text,source_url,decision,reviewer_id,reviewed_at)
SELECT id,candidate_id,field_key,suggested_value,evidence_text,source_url,decision,reviewer_id,reviewed_at
FROM candidate_field_reviews_old;

DROP TABLE candidate_field_reviews_old;

CREATE INDEX IF NOT EXISTS idx_candidate_field_reviews_candidate
  ON candidate_field_reviews(candidate_id, reviewed_at DESC);
