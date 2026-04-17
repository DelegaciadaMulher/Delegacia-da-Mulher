BEGIN;

CREATE TABLE IF NOT EXISTS scheduling_settings (
  id SMALLINT PRIMARY KEY,
  victim_author_gap_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scheduling_settings_singleton_chk CHECK (id = 1),
  CONSTRAINT scheduling_settings_gap_chk CHECK (victim_author_gap_hours >= 0)
);

INSERT INTO scheduling_settings (id, victim_author_gap_hours)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;