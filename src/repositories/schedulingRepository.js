const pool = require('../config/database');

async function createAvailabilitySlot({ startsAt, endsAt }) {
  const query = `
    INSERT INTO availability_slots (starts_at, ends_at, status)
    VALUES ($1, $2, 'DISPONIVEL')
    ON CONFLICT (starts_at) DO NOTHING
    RETURNING
      id,
      starts_at AS "startsAt",
      ends_at AS "endsAt",
      status
  `;

  const { rows } = await pool.query(query, [startsAt, endsAt]);
  return rows[0] || null;
}

async function listAvailabilityByDate(date) {
  const query = `
    SELECT
      id,
      starts_at AS "startsAt",
      ends_at AS "endsAt",
      status
    FROM availability_slots
    WHERE starts_at::date = $1::date
    ORDER BY starts_at ASC
  `;

  const { rows } = await pool.query(query, [date]);
  return rows;
}

async function bookAppointment({ slotId, personId, userId, appointmentType, notes, attendanceCode, caseId, personRole }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockSlotQuery = `
      SELECT id, starts_at AS "startsAt", ends_at AS "endsAt", status
      FROM availability_slots
      WHERE id = $1
      FOR UPDATE
    `;

    const slotResult = await client.query(lockSlotQuery, [slotId]);
    const slot = slotResult.rows[0];

    if (!slot) {
      const error = new Error('Horario nao encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (slot.status !== 'DISPONIVEL') {
      const error = new Error('Horario indisponivel para agendamento.');
      error.statusCode = 409;
      throw error;
    }

    const createAppointmentQuery = `
      INSERT INTO appointments (
        slot_id,
        person_id,
        user_id,
        case_id,
        person_role,
        appointment_type,
        status,
        notes,
        attendance_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'AGENDADO', $7, $8)
      RETURNING
        id,
        slot_id AS "slotId",
        person_id AS "personId",
        user_id AS "userId",
        case_id AS "caseId",
        person_role AS "personRole",
        appointment_type AS "appointmentType",
        status,
        notes,
        attendance_code AS "attendanceCode",
        booked_at AS "bookedAt",
        created_at AS "createdAt"
    `;

    const appointmentResult = await client.query(createAppointmentQuery, [
      slotId,
      personId,
      userId || null,
      caseId || null,
      personRole || null,
      appointmentType,
      notes || null,
      attendanceCode
    ]);

    await client.query(
      `
      UPDATE availability_slots
      SET status = 'RESERVADO', updated_at = NOW()
      WHERE id = $1
      `,
      [slotId]
    );

    await client.query('COMMIT');

    return {
      slot,
      appointment: appointmentResult.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function confirmAttendanceByCode({ attendanceCode, adminUserId }) {
  const query = `
    UPDATE appointments
    SET
      status = 'CONCLUIDO',
      attendance_confirmed_at = NOW(),
      attendance_confirmed_by_user_id = $2,
      updated_at = NOW()
    WHERE attendance_code = $1
      AND attendance_confirmed_at IS NULL
      AND status <> 'CANCELADO'
    RETURNING
      id,
      slot_id AS "slotId",
      person_id AS "personId",
      case_id AS "caseId",
      person_role AS "personRole",
      status,
      attendance_code AS "attendanceCode",
      attendance_confirmed_at AS "attendanceConfirmedAt",
      attendance_confirmed_by_user_id AS "attendanceConfirmedByUserId",
      updated_at AS "updatedAt"
  `;

  const { rows } = await pool.query(query, [attendanceCode, adminUserId || null]);
  return rows[0] || null;
}

module.exports = {
  createAvailabilitySlot,
  listAvailabilityByDate,
  bookAppointment,
  confirmAttendanceByCode
};
