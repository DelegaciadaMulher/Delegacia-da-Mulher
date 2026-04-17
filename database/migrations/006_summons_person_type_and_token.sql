BEGIN;

ALTER TABLE summons
  ADD COLUMN IF NOT EXISTS person_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS summons_text TEXT,
  ADD COLUMN IF NOT EXISTS token_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS token_jti VARCHAR(64),
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'summons_person_type_chk'
  ) THEN
    ALTER TABLE summons
      ADD CONSTRAINT summons_person_type_chk
      CHECK (
        person_type IS NULL
        OR person_type IN ('VITIMA', 'AUTOR', 'TESTEMUNHA', 'RESPONSAVEL')
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_summons_token_jti
  ON summons (token_jti)
  WHERE token_jti IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_summons_person_type
  ON summons (person_type)
  WHERE person_type IS NOT NULL;

COMMIT;
