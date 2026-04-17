BEGIN;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS case_id BIGINT,
  ADD COLUMN IF NOT EXISTS person_role VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_case_fk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_case_fk
      FOREIGN KEY (case_id)
      REFERENCES cases(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_person_role_chk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_person_role_chk
      CHECK (person_role IS NULL OR person_role IN ('VITIMA', 'AUTOR', 'TESTEMUNHA', 'RESPONSAVEL'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_appointments_case_id
  ON appointments (case_id)
  WHERE case_id IS NOT NULL;

COMMIT;
