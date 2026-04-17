const dayjs = require('dayjs');
const crypto = require('crypto');

const schedulingRepository = require('../repositories/schedulingRepository');
const personService = require('./personService');
const victimNotificationService = require('./victimNotificationService');

function parseDateAndTime(date, time) {
  return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm', true);
}

function validateGeneratePayload(payload) {
  const date = String(payload.date || '').trim();
  const startTime = String(payload.startTime || '').trim();
  const endTime = String(payload.endTime || '').trim();
  const intervalMinutes = Number(payload.intervalMinutes || 30);

  const start = parseDateAndTime(date, startTime);
  const end = parseDateAndTime(date, endTime);

  if (!start.isValid() || !end.isValid()) {
    const error = new Error('Data/horario invalido. Use date YYYY-MM-DD, startTime HH:mm e endTime HH:mm.');
    error.statusCode = 400;
    throw error;
  }

  if (intervalMinutes < 10 || intervalMinutes > 240) {
    const error = new Error('intervalMinutes deve ficar entre 10 e 240.');
    error.statusCode = 400;
    throw error;
  }

  if (!end.isAfter(start)) {
    const error = new Error('endTime deve ser maior que startTime.');
    error.statusCode = 400;
    throw error;
  }

  return {
    date,
    start,
    end,
    intervalMinutes
  };
}

async function generateAvailability(payload) {
  const input = validateGeneratePayload(payload);
  const created = [];

  let cursor = input.start;
  while (true) {
    const slotStart = cursor;
    const slotEnd = cursor.add(input.intervalMinutes, 'minute');

    if (slotEnd.isAfter(input.end)) {
      break;
    }

    const slot = await schedulingRepository.createAvailabilitySlot({
      startsAt: slotStart.toDate(),
      endsAt: slotEnd.toDate()
    });

    if (slot) {
      created.push(slot);
    }

    cursor = slotEnd;
  }

  return {
    date: input.date,
    createdCount: created.length,
    slots: created
  };
}

async function listAvailability(date) {
  const normalizedDate = String(date || '').trim();
  if (!dayjs(normalizedDate, 'YYYY-MM-DD', true).isValid()) {
    const error = new Error('Data invalida. Use YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  const slots = await schedulingRepository.listAvailabilityByDate(normalizedDate);
  return {
    date: normalizedDate,
    slots
  };
}

function validateBookPayload(payload) {
  const slotId = Number(payload.slotId);
  const appointmentType = String(payload.appointmentType || 'ATENDIMENTO').trim().toUpperCase();
  const caseId = payload.caseId ? Number(payload.caseId) : null;
  const personRole = payload.personRole ? String(payload.personRole).trim().toUpperCase() : null;

  if (!Number.isInteger(slotId) || slotId <= 0) {
    const error = new Error('slotId invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.person || !payload.person.cpf || !payload.person.fullName) {
    const error = new Error('Informe person.cpf e person.fullName para agendar.');
    error.statusCode = 400;
    throw error;
  }

  if (caseId !== null && (!Number.isInteger(caseId) || caseId <= 0)) {
    const error = new Error('caseId invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (personRole !== null && !['VITIMA', 'AUTOR', 'TESTEMUNHA', 'RESPONSAVEL'].includes(personRole)) {
    const error = new Error('personRole invalido. Use VITIMA, AUTOR, TESTEMUNHA ou RESPONSAVEL.');
    error.statusCode = 400;
    throw error;
  }

  return {
    slotId,
    appointmentType,
    notes: payload.notes || null,
    userId: payload.userId || null,
    caseId,
    personRole,
    person: payload.person
  };
}

function generateAttendanceCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function tryBookWithUniqueAttendanceCode(params) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const attendanceCode = generateAttendanceCode();

    try {
      return await schedulingRepository.bookAppointment({
        ...params,
        attendanceCode
      });
    } catch (error) {
      if (error.code === '23505') {
        continue;
      }

      throw error;
    }
  }

  const error = new Error('Nao foi possivel gerar codigo unico de confirmacao. Tente novamente.');
  error.statusCode = 500;
  throw error;
}

async function bookAppointment(payload) {
  const input = validateBookPayload(payload);

  const person = await personService.upsertPerson({
    cpf: input.person.cpf,
    fullName: input.person.fullName,
    phone: input.person.phone,
    email: input.person.email
  });

  const result = await tryBookWithUniqueAttendanceCode({
    slotId: input.slotId,
    personId: person.id,
    userId: input.userId,
    caseId: input.caseId,
    personRole: input.personRole,
    appointmentType: input.appointmentType,
    notes: input.notes
  });

  return {
    person,
    slot: result.slot,
    appointment: result.appointment
  };
}

async function confirmAttendance(payload) {
  const attendanceCode = String(payload.attendanceCode || '').trim().toUpperCase();
  const adminUserId = payload.adminUserId ? Number(payload.adminUserId) : null;

  if (!attendanceCode) {
    const error = new Error('attendanceCode e obrigatorio.');
    error.statusCode = 400;
    throw error;
  }

  if (adminUserId !== null && (!Number.isInteger(adminUserId) || adminUserId <= 0)) {
    const error = new Error('adminUserId invalido.');
    error.statusCode = 400;
    throw error;
  }

  const confirmed = await schedulingRepository.confirmAttendanceByCode({
    attendanceCode,
    adminUserId
  });

  if (!confirmed) {
    const error = new Error('Codigo invalido, ja utilizado ou agendamento cancelado.');
    error.statusCode = 404;
    throw error;
  }

  let victimNotifications = null;
  if (confirmed.caseId && confirmed.personRole === 'AUTOR') {
    victimNotifications = await victimNotificationService.notifyAuthorAttended({
      caseId: confirmed.caseId,
      authorName: ''
    });
  }

  return {
    appointment: confirmed,
    victimNotifications
  };
}

module.exports = {
  generateAvailability,
  listAvailability,
  bookAppointment,
  confirmAttendance
};
