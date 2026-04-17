BEGIN;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS attendance_code VARCHAR(12),
  ADD COLUMN IF NOT EXISTS attendance_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_confirmed_by_user_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_attendance_confirmed_by_fk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_attendance_confirmed_by_fk
      FOREIGN KEY (attendance_confirmed_by_user_id)
      REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_attendance_code
  ON appointments (attendance_code)
  WHERE attendance_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_attendance_confirmed_at
  ON appointments (attendance_confirmed_at)
  WHERE attendance_confirmed_at IS NOT NULL;

COMMIT;
