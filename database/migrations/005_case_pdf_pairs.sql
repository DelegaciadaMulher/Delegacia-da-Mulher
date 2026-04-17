BEGIN;

CREATE TABLE IF NOT EXISTS case_pdf_pairs (
  id BIGSERIAL PRIMARY KEY,
  expected_case_id BIGINT NOT NULL,
  bo_file_name VARCHAR(255) NOT NULL,
  bo_file_path TEXT NOT NULL,
  extrato_file_name VARCHAR(255) NOT NULL,
  extrato_file_path TEXT NOT NULL,
  extracted_bo_data JSONB NOT NULL,
  extracted_extrato_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_pdf_pairs_expected_case_fk
    FOREIGN KEY (expected_case_id)
    REFERENCES expected_cases(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT case_pdf_pairs_expected_case_unique UNIQUE (expected_case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_pdf_pairs_created_at
  ON case_pdf_pairs (created_at DESC);

COMMIT;
