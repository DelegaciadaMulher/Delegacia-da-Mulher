BEGIN;

CREATE TABLE IF NOT EXISTS persons (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  cpf CHAR(11) NOT NULL UNIQUE,
  birth_date DATE,
  phone VARCHAR(20),
  email VARCHAR(120),
  address_line VARCHAR(255),
  neighborhood VARCHAR(120),
  city VARCHAR(120),
  state CHAR(2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT persons_cpf_format_chk CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  person_id BIGINT,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'agent',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_person_fk
    FOREIGN KEY (person_id)
    REFERENCES persons(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT users_role_chk
    CHECK (role IN ('admin', 'manager', 'agent'))
);

CREATE TABLE IF NOT EXISTS daily_imports (
  id BIGSERIAL PRIMARY KEY,
  import_date DATE NOT NULL,
  source_name VARCHAR(120) NOT NULL,
  imported_by_user_id BIGINT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_imports_user_fk
    FOREIGN KEY (imported_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT daily_imports_counts_chk
    CHECK (total_rows >= 0 AND successful_rows >= 0 AND failed_rows >= 0)
);

CREATE TABLE IF NOT EXISTS expected_cases (
  id BIGSERIAL PRIMARY KEY,
  daily_import_id BIGINT NOT NULL,
  reference_date DATE NOT NULL,
  neighborhood VARCHAR(120),
  expected_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expected_cases_import_fk
    FOREIGN KEY (daily_import_id)
    REFERENCES daily_imports(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT expected_cases_count_chk
    CHECK (expected_count >= 0)
);

CREATE TABLE IF NOT EXISTS cases (
  id BIGSERIAL PRIMARY KEY,
  protocol_number VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by_user_id BIGINT,
  assigned_to_user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cases_created_by_fk
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT cases_assigned_to_fk
    FOREIGN KEY (assigned_to_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT cases_status_chk
    CHECK (status IN ('open', 'in_progress', 'closed', 'archived')),
  CONSTRAINT cases_priority_chk
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE TABLE IF NOT EXISTS case_person (
  case_id BIGINT NOT NULL,
  person_id BIGINT NOT NULL,
  person_role VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (case_id, person_id, person_role),
  CONSTRAINT case_person_case_fk
    FOREIGN KEY (case_id)
    REFERENCES cases(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT case_person_person_fk
    FOREIGN KEY (person_id)
    REFERENCES persons(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT case_person_role_chk
    CHECK (person_role IN ('victim', 'witness', 'suspect', 'reporter', 'guardian'))
);

CREATE TABLE IF NOT EXISTS summons (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT NOT NULL,
  person_id BIGINT NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  delivery_channel VARCHAR(30),
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_by_user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT summons_case_fk
    FOREIGN KEY (case_id)
    REFERENCES cases(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT summons_person_fk
    FOREIGN KEY (person_id)
    REFERENCES persons(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT summons_created_by_fk
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT summons_status_chk
    CHECK (status IN ('pending', 'sent', 'received', 'cancelled', 'expired')),
  CONSTRAINT summons_channel_chk
    CHECK (delivery_channel IS NULL OR delivery_channel IN ('email', 'sms', 'whatsapp', 'in_person', 'letter'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  person_id BIGINT,
  case_id BIGINT,
  message TEXT NOT NULL,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT notifications_person_fk
    FOREIGN KEY (person_id)
    REFERENCES persons(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT notifications_case_fk
    FOREIGN KEY (case_id)
    REFERENCES cases(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT notifications_target_chk
    CHECK (user_id IS NOT NULL OR person_id IS NOT NULL),
  CONSTRAINT notifications_status_chk
    CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'cancelled')),
  CONSTRAINT notifications_channel_chk
    CHECK (channel IN ('email', 'sms', 'whatsapp', 'push'))
);

CREATE TABLE IF NOT EXISTS auth_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  code VARCHAR(12) NOT NULL,
  code_type VARCHAR(30) NOT NULL DEFAULT 'login_2fa',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_codes_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT auth_codes_code_unique UNIQUE (user_id, code, code_type),
  CONSTRAINT auth_codes_type_chk
    CHECK (code_type IN ('login_2fa', 'email_verification', 'password_reset')),
  CONSTRAINT auth_codes_expiration_chk
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_persons_full_name ON persons (full_name);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_opened_at ON cases (opened_at);
CREATE INDEX IF NOT EXISTS idx_case_person_person_id ON case_person (person_id);
CREATE INDEX IF NOT EXISTS idx_summons_case_id ON summons (case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_case_id ON notifications (case_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_user_id ON auth_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_expected_cases_reference_date ON expected_cases (reference_date);

COMMIT;
