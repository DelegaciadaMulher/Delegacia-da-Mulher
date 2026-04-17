BEGIN;

ALTER TABLE daily_imports
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_imports_period_chk'
  ) THEN
    ALTER TABLE daily_imports
      ADD CONSTRAINT daily_imports_period_chk
      CHECK (
        period_start IS NULL
        OR period_end IS NULL
        OR period_end > period_start
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_imports_period
  ON daily_imports (period_start, period_end)
  WHERE period_start IS NOT NULL AND period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_imports_period_end
  ON daily_imports (period_end DESC)
  WHERE period_end IS NOT NULL;

COMMIT;
