BEGIN;

ALTER TABLE scheduling_settings
ADD COLUMN IF NOT EXISTS author_summons_max_days INTEGER NOT NULL DEFAULT 3;

UPDATE scheduling_settings
SET author_summons_max_days = 3
WHERE author_summons_max_days IS NULL;

ALTER TABLE scheduling_settings
DROP CONSTRAINT IF EXISTS scheduling_settings_author_summons_max_days_chk;

ALTER TABLE scheduling_settings
ADD CONSTRAINT scheduling_settings_author_summons_max_days_chk CHECK (author_summons_max_days >= 0);

COMMIT;