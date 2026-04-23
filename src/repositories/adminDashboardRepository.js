const pool = require('../config/database');

async function hasExpectedCasesExtractionOrderColumn() {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'expected_cases'
        AND column_name = 'extraction_order'
        AND table_schema = ANY (current_schemas(FALSE))
    ) AS "hasExtractionOrder"
  `;

  const { rows } = await pool.query(query);
  return Boolean(rows[0] && rows[0].hasExtractionOrder);
}

async function getCasesOfDay() {
  const query = `
    SELECT
      id,
      protocol_number AS "protocolNumber",
      title,
      status,
      priority,
      opened_at AS "openedAt"
    FROM cases
    WHERE opened_at::date = CURRENT_DATE
    ORDER BY opened_at DESC
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function getPendingSummary() {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM expected_cases WHERE status = 'PENDENTE')::int AS "expectedCasesPending",
      (SELECT COUNT(*) FROM summons WHERE status = 'pending')::int AS "summonsPending",
      (SELECT COUNT(*) FROM notifications WHERE status IN ('pending', 'queued', 'failed'))::int AS "notificationsPending",
      (SELECT COUNT(*) FROM users WHERE is_active = FALSE)::int AS "pendingRegistrations",
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE)::int AS "activeUsers"
  `;

  const { rows } = await pool.query(query);
  return rows[0];
}

async function getPendingRegistrationRequests() {
  const query = `
    SELECT
      u.id,
      u.full_name AS "fullName",
      u.email,
      u.role,
      u.created_at AS "createdAt",
      p.cpf,
      p.phone
    FROM users u
    LEFT JOIN persons p ON p.id = u.person_id
    WHERE u.is_active = FALSE
    ORDER BY u.created_at DESC
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function approveUserRegistration(userId) {
  const query = `
    UPDATE users
    SET is_active = TRUE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function getPendingExpectedCases() {
  const hasExtractionOrder = await hasExpectedCasesExtractionOrderColumn();
  const orderByClause = hasExtractionOrder
    ? 'daily_import_id DESC, COALESCE(extraction_order, id) ASC, id ASC'
    : 'daily_import_id DESC, id ASC';

  const query = `
    SELECT
      id,
      bo_number AS "boNumber",
      natureza,
      victim_name AS "victimName",
      author_name AS "authorName",
      status,
      created_at AS "createdAt"
    FROM expected_cases
    WHERE status = 'PENDENTE'
    ORDER BY ${orderByClause}
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function findPendingExpectedCaseById(expectedCaseId) {
  const query = `
    SELECT
      id,
      bo_number AS "boNumber",
      natureza,
      victim_name AS "victimName",
      author_name AS "authorName",
      status,
      created_at AS "createdAt"
    FROM expected_cases
    WHERE id = $1
      AND status = 'PENDENTE'
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [expectedCaseId]);
  return rows[0] || null;
}

async function findVictimAttendanceContextByBoNumber(boNumber) {
  const query = `
    SELECT
      ec.bo_number AS "boNumber",
      ec.natureza,
      ec.victim_name AS "victimName",
      COALESCE(NULLIF(pair.extracted_bo_data->>'victimCpf', ''), NULL) AS "victimCpf",
      person.phone AS "victimPhone",
      person.email AS "victimEmail"
    FROM expected_cases ec
    LEFT JOIN LATERAL (
      SELECT cpp.extracted_bo_data
      FROM case_pdf_pairs cpp
      WHERE cpp.expected_case_id = ec.id
      ORDER BY cpp.created_at DESC
      LIMIT 1
    ) pair ON TRUE
    LEFT JOIN persons person
      ON person.cpf = COALESCE(NULLIF(pair.extracted_bo_data->>'victimCpf', ''), NULL)
    WHERE UPPER(REPLACE(ec.bo_number, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
    ORDER BY COALESCE(ec.updated_at, ec.created_at) DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [boNumber]);
  return rows[0] || null;
}

async function markPendingCaseAsProcessing(expectedCaseId) {
  const query = `
    UPDATE expected_cases
    SET status = 'PROCESSANDO',
        updated_at = NOW()
    WHERE id = $1
      AND status = 'PENDENTE'
    RETURNING
      id,
      bo_number AS "boNumber",
      natureza,
      victim_name AS "victimName",
      author_name AS "authorName",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const { rows } = await pool.query(query, [expectedCaseId]);
  return rows[0] || null;
}

async function listInvolvedPeopleSource() {
  const query = `
    SELECT
      ec.id,
      ec.bo_number AS "boNumber",
      ec.natureza,
      ec.victim_name AS "victimName",
      ec.author_name AS "authorName",
      COALESCE(NULLIF(pair.extracted_bo_data->>'victimCpf', ''), NULL) AS "victimCpf",
      COALESCE(NULLIF(pair.extracted_bo_data->>'authorCpf', ''), NULL) AS "authorCpf",
      COALESCE(NULLIF(pair.extracted_bo_data->>'witnessName', ''), NULL) AS "witnessName",
      COALESCE(NULLIF(pair.extracted_bo_data->>'witnessCpf', ''), NULL) AS "witnessCpf",
      ec.created_at AS "createdAt",
      ec.updated_at AS "updatedAt"
    FROM expected_cases ec
    LEFT JOIN LATERAL (
      SELECT cpp.extracted_bo_data
      FROM case_pdf_pairs cpp
      WHERE cpp.expected_case_id = ec.id
      ORDER BY cpp.created_at DESC
      LIMIT 1
    ) pair ON TRUE
    WHERE ec.bo_number IS NOT NULL
    ORDER BY COALESCE(ec.updated_at, ec.created_at) DESC
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function getActiveUsers() {
  const query = `
    SELECT
      u.id,
      u.full_name AS "fullName",
      u.email,
      u.role,
      u.is_active AS "isActive",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      p.cpf,
      p.phone
    FROM users u
    LEFT JOIN persons p ON p.id = u.person_id
    WHERE u.is_active = TRUE
    ORDER BY
      CASE
        WHEN p.cpf = '40280221851'
          OR LOWER(u.email) = 'stephanieps.amorim@gmail.com'
        THEN 0
        ELSE 1
      END ASC,
      COALESCE(u.updated_at, u.created_at) DESC,
      u.full_name ASC
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function getNotifications() {
  const query = `
    SELECT
      n.id,
      COALESCE(target_person.full_name, user_person.full_name, u.full_name) AS "targetName",
      COALESCE(target_person.cpf, user_person.cpf) AS "targetCpf",
      COALESCE(target_person.phone, user_person.phone) AS "targetPhone",
      n.message,
      n.channel,
      n.status,
      n.scheduled_for AS "scheduledFor",
      n.sent_at AS "sentAt",
      n.created_at AS "createdAt",
      c.id AS "caseId",
      c.protocol_number AS "caseProtocolNumber"
    FROM notifications n
    LEFT JOIN persons target_person ON target_person.id = n.person_id
    LEFT JOIN users u ON u.id = n.user_id
    LEFT JOIN persons user_person ON user_person.id = u.person_id
    LEFT JOIN cases c ON c.id = n.case_id
    ORDER BY
      CASE
        WHEN n.status IN ('pending', 'queued', 'failed') THEN 0
        ELSE 1
      END ASC,
      COALESCE(n.scheduled_for, n.sent_at, n.created_at) DESC,
      n.id DESC
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function findUserById(userId) {
  const query = `
    SELECT
      u.id,
      u.person_id AS "personId",
      u.full_name AS "fullName",
      u.email,
      u.role,
      u.is_active AS "isActive",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      p.cpf,
      p.phone
    FROM users u
    LEFT JOIN persons p ON p.id = u.person_id
    WHERE u.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function deleteUser(userId) {
  const query = `
    DELETE FROM users
    WHERE id = $1
    RETURNING id
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function getAgendaOfDay() {
  const query = `
    SELECT
      a.id,
      a.slot_id AS "slotId",
      a.status,
      a.appointment_type AS "appointmentType",
      a.person_role AS "personRole",
      s.starts_at AS "startsAt",
      s.ends_at AS "endsAt",
      p.full_name AS "personName"
    FROM appointments a
    INNER JOIN availability_slots s ON s.id = a.slot_id
    INNER JOIN persons p ON p.id = a.person_id
    WHERE s.starts_at::date = CURRENT_DATE
    ORDER BY s.starts_at ASC
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

async function listAgendaByMonth({ monthStart, nextMonthStart }) {
  const query = `
    SELECT
      a.id,
      a.slot_id AS "slotId",
      a.status,
      a.appointment_type AS "appointmentType",
      a.person_role AS "personRole",
      s.starts_at AS "startsAt",
      s.ends_at AS "endsAt",
      p.full_name AS "personName"
    FROM appointments a
    INNER JOIN availability_slots s ON s.id = a.slot_id
    INNER JOIN persons p ON p.id = a.person_id
    WHERE s.starts_at::date >= $1::date
      AND s.starts_at::date < $2::date
    ORDER BY s.starts_at ASC, p.full_name ASC
  `;

  const { rows } = await pool.query(query, [monthStart, nextMonthStart]);
  return {
    total: rows.length,
    items: rows
  };
}

async function getRecurrenceSummary() {
  const query = `
    SELECT
      s.person_id AS "personId",
      p.full_name AS "personName",
      p.cpf,
      COUNT(DISTINCT s.case_id)::int AS "caseCount"
    FROM summons s
    INNER JOIN persons p ON p.id = s.person_id
    WHERE s.person_type = 'AUTOR'
      AND s.case_id IS NOT NULL
    GROUP BY s.person_id, p.full_name, p.cpf
    HAVING COUNT(DISTINCT s.case_id) > 1
    ORDER BY COUNT(DISTINCT s.case_id) DESC, p.full_name ASC
    LIMIT 20
  `;

  const { rows } = await pool.query(query);
  return {
    total: rows.length,
    items: rows
  };
}

module.exports = {
  getCasesOfDay,
  getPendingSummary,
  getPendingRegistrationRequests,
  approveUserRegistration,
  getPendingExpectedCases,
  findPendingExpectedCaseById,
  findVictimAttendanceContextByBoNumber,
  markPendingCaseAsProcessing,
  listInvolvedPeopleSource,
  getActiveUsers,
  getNotifications,
  findUserById,
  deleteUser,
  getAgendaOfDay,
  listAgendaByMonth,
  getRecurrenceSummary
};
