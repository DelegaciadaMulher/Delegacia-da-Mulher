BEGIN;

CREATE TABLE IF NOT EXISTS availability_slots (
  id BIGSERIAL PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_slots_time_chk CHECK (ends_at > starts_at),
  CONSTRAINT availability_slots_status_chk CHECK (status IN ('DISPONIVEL', 'RESERVADO', 'BLOQUEADO')),
  CONSTRAINT availability_slots_start_unique UNIQUE (starts_at)
);

CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  slot_id BIGINT NOT NULL,
  person_id BIGINT NOT NULL,
  user_id BIGINT,
  appointment_type VARCHAR(40) NOT NULL DEFAULT 'ATENDIMENTO',
  status VARCHAR(20) NOT NULL DEFAULT 'AGENDADO',
  notes TEXT,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_slot_fk
    FOREIGN KEY (slot_id)
    REFERENCES availability_slots(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT appointments_person_fk
    FOREIGN KEY (person_id)
    REFERENCES persons(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT appointments_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT appointments_slot_unique UNIQUE (slot_id),
  CONSTRAINT appointments_status_chk CHECK (status IN ('AGENDADO', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO'))
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON availability_slots (starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_person_id ON appointments (person_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

COMMIT;
