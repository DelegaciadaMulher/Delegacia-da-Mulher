const pool = require('../config/database');

const EXPECTED_CASE_TEXT_LIMIT = 200;

function clampExpectedCaseText(value) {
  const normalized = value == null ? '' : String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, EXPECTED_CASE_TEXT_LIMIT).trim() || null;
}

async function createExpectedCaseFromBo({ dailyImportId, periodStart, boBook, extractionOrder }) {
  const query = `
    INSERT INTO expected_cases (
      daily_import_id,
      reference_date,
      neighborhood,
      expected_count,
      status,
      bo_number,
      natureza,
      victim_name,
      author_name,
      extraction_order
    )
    VALUES ($1, $2, NULL, 1, 'PENDENTE', $3, $4, $5, $6, $7)
    ON CONFLICT (daily_import_id, bo_number)
    WHERE bo_number IS NOT NULL
    DO UPDATE SET
      natureza = COALESCE(NULLIF(expected_cases.natureza, ''), EXCLUDED.natureza),
      victim_name = COALESCE(NULLIF(expected_cases.victim_name, ''), EXCLUDED.victim_name),
      author_name = COALESCE(NULLIF(expected_cases.author_name, ''), EXCLUDED.author_name),
      extraction_order = EXCLUDED.extraction_order
    RETURNING
      id,
      daily_import_id AS "dailyImportId",
      reference_date AS "referenceDate",
      status,
      bo_number AS "boNumber",
      natureza,
      victim_name AS "victimName",
      author_name AS "authorName",
      extraction_order AS "extractionOrder",
      created_at AS "createdAt"
  `;

  const values = [
    dailyImportId,
    periodStart.toISOString().slice(0, 10),
    boBook.boNumber,
    clampExpectedCaseText(boBook.natureza),
    clampExpectedCaseText(boBook.victim),
    clampExpectedCaseText(boBook.author),
    Number.isInteger(Number(extractionOrder)) && Number(extractionOrder) > 0
      ? Number(extractionOrder)
      : null
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

module.exports = {
  createExpectedCaseFromBo
};
