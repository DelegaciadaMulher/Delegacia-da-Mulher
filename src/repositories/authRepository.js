const pool = require('../config/database');

async function findActiveUserByCpf(cpf) {
  const query = `
    SELECT
      u.id,
      u.person_id AS "personId",
      u.full_name AS "fullName",
      u.email,
      u.role,
      u.is_active AS "isActive",
      p.cpf,
      p.phone
    FROM users u
    INNER JOIN persons p ON p.id = u.person_id
    WHERE p.cpf = $1
      AND u.is_active = TRUE
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [cpf]);
  return rows[0] || null;
}

async function createAuthCode({ userId, codeHash, codeType, expiresAt }) {
  const query = `
    INSERT INTO auth_codes (user_id, code, code_type, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id AS "userId", code_type AS "codeType", expires_at AS "expiresAt"
  `;

  const { rows } = await pool.query(query, [userId, codeHash, codeType, expiresAt]);
  return rows[0];
}

async function findLatestValidAuthCode({ userId, codeType }) {
  const query = `
    SELECT
      id,
      user_id AS "userId",
      code,
      code_type AS "codeType",
      expires_at AS "expiresAt",
      used_at AS "usedAt"
    FROM auth_codes
    WHERE user_id = $1
      AND code_type = $2
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [userId, codeType]);
  return rows[0] || null;
}

async function markAuthCodeUsed(codeId) {
  const query = `
    UPDATE auth_codes
    SET used_at = NOW()
    WHERE id = $1
  `;

  await pool.query(query, [codeId]);
}

async function createUserSession({ userId, sessionJti, tokenHash, channel, expiresAt }) {
  const query = `
    INSERT INTO user_sessions (user_id, session_jti, token_hash, channel, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      user_id AS "userId",
      session_jti AS "sessionJti",
      channel,
      created_at AS "createdAt",
      expires_at AS "expiresAt"
  `;

  const { rows } = await pool.query(query, [userId, sessionJti, tokenHash, channel, expiresAt]);
  return rows[0];
}

async function findActiveSessionByJti(sessionJti) {
  const query = `
    SELECT
      us.id,
      us.user_id AS "userId",
      us.session_jti AS "sessionJti",
      us.expires_at AS "expiresAt",
      us.revoked_at AS "revokedAt",
      u.role
    FROM user_sessions us
    INNER JOIN users u ON u.id = us.user_id
    WHERE us.session_jti = $1
      AND us.revoked_at IS NULL
      AND us.expires_at > NOW()
      AND u.is_active = TRUE
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [sessionJti]);
  return rows[0] || null;
}

module.exports = {
  findActiveUserByCpf,
  createAuthCode,
  findLatestValidAuthCode,
  markAuthCodeUsed,
  createUserSession,
  findActiveSessionByJti
};
