const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

const env = require('../config/env');
const personRepository = require('../repositories/personRepository');
const personService = require('./personService');
const summonsRepository = require('../repositories/summonsRepository');
const schedulingService = require('./schedulingService');
const victimNotificationService = require('./victimNotificationService');

const PERSON_TYPES = ['VITIMA', 'AUTOR', 'TESTEMUNHA', 'RESPONSAVEL'];

const SUMMONS_TEMPLATE_BY_TYPE = {
  VITIMA: {
    daysToDue: 5,
    text: 'Voce esta sendo intimada(o) na qualidade de vitima para comparecimento e prestacao de declaracoes.'
  },
  AUTOR: {
    daysToDue: 3,
    text: 'Voce esta sendo intimada(o) na qualidade de autor para comparecimento e esclarecimentos.'
  },
  TESTEMUNHA: {
    daysToDue: 7,
    text: 'Voce esta sendo intimada(o) na qualidade de testemunha para comparecimento e depoimento.'
  },
  RESPONSAVEL: {
    daysToDue: 4,
    text: 'Voce esta sendo intimada(o) na qualidade de responsavel legal para comparecimento e acompanhamento do caso.'
  }
};

function normalizePersonType(personType) {
  return String(personType || '').trim().toUpperCase();
}

function normalizeCpf(cpf) {
  return personService.normalizeCpf(cpf);
}

function validatePayload(payload) {
  const caseId = Number(payload.caseId);
  const cpf = normalizeCpf(payload.cpf);
  const personType = normalizePersonType(payload.personType);

  if (!Number.isInteger(caseId) || caseId <= 0) {
    const error = new Error('caseId invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (!cpf || cpf.length !== 11) {
    const error = new Error('CPF invalido. Informe 11 digitos.');
    error.statusCode = 400;
    throw error;
  }

  if (!PERSON_TYPES.includes(personType)) {
    const error = new Error(`personType invalido. Valores aceitos: ${PERSON_TYPES.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  return {
    caseId,
    cpf,
    personType,
    deliveryChannel: payload.deliveryChannel || null,
    notes: payload.notes || null,
    createdByUserId: payload.createdByUserId || null,
    dueDate: payload.dueDate || null,
    person: payload.person || null
  };
}

async function resolvePersonByCpf(input) {
  const existingPerson = await personRepository.findByCpf(input.cpf);
  if (existingPerson) {
    return existingPerson;
  }

  if (!input.person || !input.person.fullName) {
    const error = new Error('Pessoa com CPF informado nao encontrada. Envie person.fullName para criar registro.');
    error.statusCode = 404;
    throw error;
  }

  return personService.upsertPerson({
    cpf: input.cpf,
    fullName: input.person.fullName,
    phone: input.person.phone,
    email: input.person.email,
    birthDate: input.person.birthDate
  });
}

async function resolveAuthorSummonsMaxDays() {
  try {
    const settings = await schedulingService.getSchedulingSettings();
    const authorSummonsMaxDays = Number(settings && settings.authorSummonsMaxDays);

    if (Number.isInteger(authorSummonsMaxDays) && authorSummonsMaxDays >= 0 && authorSummonsMaxDays <= 365) {
      return authorSummonsMaxDays;
    }
  } catch (error) {
    // Fallback para manter o comportamento anterior caso a configuracao ainda nao esteja disponivel.
  }

  return SUMMONS_TEMPLATE_BY_TYPE.AUTOR.daysToDue;
}

async function buildDueDate(input, personType) {
  if (input.dueDate) {
    const parsed = dayjs(input.dueDate);
    if (!parsed.isValid()) {
      const error = new Error('dueDate invalido. Use formato YYYY-MM-DD.');
      error.statusCode = 400;
      throw error;
    }
    return parsed.format('YYYY-MM-DD');
  }

  if (personType === 'AUTOR') {
    const authorSummonsMaxDays = await resolveAuthorSummonsMaxDays();
    return dayjs().add(authorSummonsMaxDays, 'day').format('YYYY-MM-DD');
  }

  return dayjs().add(SUMMONS_TEMPLATE_BY_TYPE[personType].daysToDue, 'day').format('YYYY-MM-DD');
}

function buildJwtToken({ caseId, personId, personType }) {
  const secret = env.jwt.summonsSecret;
  if (!secret) {
    const error = new Error('JWT_SUMMONS_SECRET nao configurado.');
    error.statusCode = 500;
    throw error;
  }

  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      scope: 'summons',
      caseId,
      personId,
      personType
    },
    secret,
    {
      expiresIn: env.jwt.summonsExpiresIn,
      jwtid: jti
    }
  );

  const decoded = jwt.decode(token);
  const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    const error = new Error('Falha ao calcular expiracao do token JWT.');
    error.statusCode = 500;
    throw error;
  }

  return {
    token,
    tokenJti: jti,
    tokenExpiresAt: expiresAt,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex')
  };
}

function buildSummonsText(personType, personName) {
  const base = SUMMONS_TEMPLATE_BY_TYPE[personType].text;
  return `${personName}, ${base}`;
}

async function generateSummons(payload) {
  const input = validatePayload(payload);
  const person = await resolvePersonByCpf(input);
  const dueDate = await buildDueDate(input, input.personType);
  const tokenData = buildJwtToken({
    caseId: input.caseId,
    personId: person.id,
    personType: input.personType
  });

  const created = await summonsRepository.createSummons({
    caseId: input.caseId,
    personId: person.id,
    dueDate,
    deliveryChannel: input.deliveryChannel,
    notes: input.notes,
    createdByUserId: input.createdByUserId,
    personType: input.personType,
    summonsText: buildSummonsText(input.personType, person.fullName),
    tokenHash: tokenData.tokenHash,
    tokenJti: tokenData.tokenJti,
    tokenExpiresAt: tokenData.tokenExpiresAt
  });

  let victimNotifications = null;
  if (input.personType === 'AUTOR') {
    victimNotifications = await victimNotificationService.notifyAuthorSummoned({
      caseId: input.caseId,
      authorName: person.fullName
    });
  }

  return {
    summons: created,
    person,
    victimNotifications,
    token: {
      value: tokenData.token,
      expiresAt: tokenData.tokenExpiresAt.toISOString()
    }
  };
}

module.exports = {
  generateSummons
};
