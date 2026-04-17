const pool = require('../config/database');

async function createExpectedCaseFromBo({ dailyImportId, periodStart, boBook }) {
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
      author_name
    )
    VALUES ($1, $2, NULL, 1, 'PENDENTE', $3, $4, $5, $6)
    RETURNING
      id,
      daily_import_id AS "dailyImportId",
      reference_date AS "referenceDate",
      status,
      bo_number AS "boNumber",
      natureza,
      victim_name AS "victimName",
      author_name AS "authorName",
      created_at AS "createdAt"
  `;

  const values = [
    dailyImportId,
    periodStart.toISOString().slice(0, 10),
    boBook.boNumber,
    boBook.natureza,
    boBook.victim,
    boBook.author
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

module.exports = {
  createExpectedCaseFromBo
};
