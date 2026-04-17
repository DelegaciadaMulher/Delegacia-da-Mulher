const pool = require('../config/database');

async function getLastImportedPeriod() {
  const query = `
    SELECT
      id,
      source_name AS "sourceName",
      period_start AS "periodStart",
      period_end AS "periodEnd",
      created_at AS "createdAt"
    FROM daily_imports
    WHERE period_start IS NOT NULL
      AND period_end IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM expected_cases ec
        WHERE ec.daily_import_id = daily_imports.id
      )
    ORDER BY period_end DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query);
  return rows[0] || null;
}

async function findImportByPeriod({ periodStart, periodEnd }) {
  const query = `
    SELECT
      id,
      import_date AS "importDate",
      source_name AS "sourceName",
      period_start AS "periodStart",
      period_end AS "periodEnd",
      created_at AS "createdAt"
    FROM daily_imports
    WHERE period_start = $1
      AND period_end = $2
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [periodStart, periodEnd]);
  return rows[0] || null;
}

async function createImportWithPeriod({ sourceName, periodStart, periodEnd, notes }) {
  const query = `
    INSERT INTO daily_imports (
      import_date,
      source_name,
      total_rows,
      successful_rows,
      failed_rows,
      notes,
      period_start,
      period_end
    )
    VALUES ($1, $2, 0, 0, 0, $3, $4, $5)
    RETURNING
      id,
      import_date AS "importDate",
      source_name AS "sourceName",
      period_start AS "periodStart",
      period_end AS "periodEnd",
      created_at AS "createdAt"
  `;

  const values = [
    periodStart.toISOString().slice(0, 10),
    sourceName,
    notes || null,
    periodStart,
    periodEnd
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function getImportHistory(limit = 30) {
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0
    ? Number(limit)
    : 30;

  const query = `
    SELECT
      id,
      source_name AS "sourceName",
      period_start AS "periodStart",
      period_end AS "periodEnd",
      created_at AS "createdAt"
    FROM daily_imports
    WHERE period_start IS NOT NULL
      AND period_end IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM expected_cases ec
        WHERE ec.daily_import_id = daily_imports.id
      )
    ORDER BY COALESCE(created_at, period_end) DESC, id DESC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [safeLimit]);
  return {
    total: rows.length,
    items: rows
  };
}

async function deleteImportById(importId) {
  const query = `
    DELETE FROM daily_imports
    WHERE id = $1
  `;

  await pool.query(query, [importId]);
}

module.exports = {
  getLastImportedPeriod,
  findImportByPeriod,
  createImportWithPeriod,
  getImportHistory,
  deleteImportById
};
