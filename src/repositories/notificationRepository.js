const pool = require('../config/database');

async function createNotification({ personId, caseId, message, channel, status }) {
  const query = `
    INSERT INTO notifications (
      person_id,
      case_id,
      message,
      channel,
      status,
      sent_at
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      person_id AS "personId",
      case_id AS "caseId",
      channel,
      status,
      created_at AS "createdAt",
      sent_at AS "sentAt"
  `;

  const sentAt = status === 'sent' ? new Date() : null;
  const values = [personId, caseId || null, message, channel, status, sentAt];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

module.exports = {
  createNotification
};
