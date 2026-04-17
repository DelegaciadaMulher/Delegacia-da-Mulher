BEGIN;

ALTER TABLE auth_codes
  DROP CONSTRAINT IF EXISTS auth_codes_type_chk;

ALTER TABLE auth_codes
  ADD CONSTRAINT auth_codes_type_chk
  CHECK (code_type IN ('login_2fa', 'login_otp', 'email_verification', 'password_reset'));

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  session_jti VARCHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT user_sessions_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT user_sessions_channel_chk
    CHECK (channel IN ('sms', 'whatsapp')),
  CONSTRAINT user_sessions_exp_chk
    CHECK (expires_at > created_at),
  CONSTRAINT user_sessions_jti_unique UNIQUE (session_jti)
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_lookup
  ON auth_codes (user_id, code_type, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id, created_at DESC);

COMMIT;
