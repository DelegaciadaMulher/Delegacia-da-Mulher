# Banco de dados - Delegacia da Mulher

## Executar schema inicial

1. Crie o banco no PostgreSQL.
2. Execute as migracoes SQL na ordem:

```sql
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_triggers_updated_at.sql
\i database/migrations/003_daily_imports_period.sql
\i database/migrations/004_expected_cases_status_and_bo_fields.sql
\i database/migrations/005_case_pdf_pairs.sql
\i database/migrations/006_summons_person_type_and_token.sql
\i database/migrations/007_auth_otp_and_sessions.sql
\i database/migrations/008_scheduling_slots_and_appointments.sql
\i database/migrations/009_appointments_attendance_code.sql
\i database/migrations/010_appointments_case_role.sql
```

Ou via terminal:

```bash
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/001_initial_schema.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/002_triggers_updated_at.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/003_daily_imports_period.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/004_expected_cases_status_and_bo_fields.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/005_case_pdf_pairs.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/006_summons_person_type_and_token.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/007_auth_otp_and_sessions.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/008_scheduling_slots_and_appointments.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/009_appointments_attendance_code.sql
psql -h localhost -p 5432 -U postgres -d delegacia_mulher -f database/migrations/010_appointments_case_role.sql
```

## Observacoes de modelagem

- `persons.cpf` e unico e validado por regex para 11 digitos.
- `case_person` implementa relacao N:N entre casos e pessoas, com papel (`person_role`).
- `daily_imports` armazena metadados de importacoes; `expected_cases` depende dela.
- `daily_imports` possui `period_start` e `period_end` para validar continuidade entre importacoes.
- `auth_codes` armazena codigos temporarios para autenticacao e recuperacao de acesso.
- `summons` agora suporta `person_type`, texto de intimacao e metadados de token JWT seguro com expiracao.
- `availability_slots` e `appointments` suportam disponibilizacao e reserva de horarios.
- `appointments.attendance_code` permite confirmacao unica de comparecimento pelo admin.
- notificacoes automaticas para vitima sao disparadas quando autor e intimado e quando autor comparece.
