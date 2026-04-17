const pool = require('../config/database');

async function listVictimsByCaseId(caseId) {
  const query = `
    SELECT
      p.id,
      p.full_name AS "fullName",
      p.phone,
      p.email
    FROM case_person cp
    INNER JOIN persons p ON p.id = cp.person_id
    WHERE cp.case_id = $1
      AND cp.person_role = 'victim'
  `;

  const { rows } = await pool.query(query, [caseId]);
  return rows;
}

module.exports = {
  listVictimsByCaseId
};
