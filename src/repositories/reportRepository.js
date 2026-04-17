const pool = require('../config/database');

async function createReport({ victimName, description, neighborhood }) {
  const query = `
    INSERT INTO reports (victim_name, description, neighborhood)
    VALUES ($1, $2, $3)
    RETURNING id, victim_name AS "victimName", description, neighborhood, created_at AS "createdAt"
  `;

  const values = [victimName, description, neighborhood];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function listReports() {
  const query = `
    SELECT
      id,
      victim_name AS "victimName",
      description,
      neighborhood,
      created_at AS "createdAt"
    FROM reports
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

module.exports = {
  createReport,
  listReports
};
