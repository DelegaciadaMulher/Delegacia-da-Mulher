const pool = require('../config/database');

async function findByCpf(cpf) {
  const query = `
    SELECT
      id,
      full_name AS "fullName",
      cpf,
      birth_date AS "birthDate",
      phone,
      email,
      address_line AS "addressLine",
      neighborhood,
      city,
      state,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM persons
    WHERE cpf = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [cpf]);
  return rows[0] || null;
}

async function upsertPersonByCpf(person) {
  const query = `
    INSERT INTO persons (
      full_name,
      cpf,
      birth_date,
      phone,
      email,
      address_line,
      neighborhood,
      city,
      state
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (cpf)
    DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, persons.full_name),
      birth_date = COALESCE(EXCLUDED.birth_date, persons.birth_date),
      phone = COALESCE(EXCLUDED.phone, persons.phone),
      email = COALESCE(EXCLUDED.email, persons.email),
      address_line = COALESCE(EXCLUDED.address_line, persons.address_line),
      neighborhood = COALESCE(EXCLUDED.neighborhood, persons.neighborhood),
      city = COALESCE(EXCLUDED.city, persons.city),
      state = COALESCE(EXCLUDED.state, persons.state),
      updated_at = NOW()
    RETURNING
      id,
      full_name AS "fullName",
      cpf,
      birth_date AS "birthDate",
      phone,
      email,
      address_line AS "addressLine",
      neighborhood,
      city,
      state,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const values = [
    person.fullName,
    person.cpf,
    person.birthDate || null,
    person.phone || null,
    person.email || null,
    person.addressLine || null,
    person.neighborhood || null,
    person.city || null,
    person.state || null
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

module.exports = {
  findByCpf,
  upsertPersonByCpf
};
