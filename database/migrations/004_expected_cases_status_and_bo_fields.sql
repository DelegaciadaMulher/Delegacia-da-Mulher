BEGIN;

ALTER TABLE expected_cases
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS bo_number VARCHAR(40),
  ADD COLUMN IF NOT EXISTS natureza VARCHAR(255),
  ADD COLUMN IF NOT EXISTS victim_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(200);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expected_cases_status_chk'
  ) THEN
    ALTER TABLE expected_cases
      ADD CONSTRAINT expected_cases_status_chk
      CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'CRIADO', 'DESCARTADO'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_expected_cases_daily_import_bo
  ON expected_cases (daily_import_id, bo_number)
  WHERE bo_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expected_cases_status
  ON expected_cases (status);

COMMIT;
