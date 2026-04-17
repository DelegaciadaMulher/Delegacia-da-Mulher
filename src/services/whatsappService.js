const whatsappClient = require('../clients/whatsappClient');
const summonsRepository = require('../repositories/summonsRepository');
const env = require('../config/env');

const TEMPLATE_BY_PERSON_TYPE = {
  VITIMA: 'intimacao_vitima',
  AUTOR: 'intimacao_autor',
  TESTEMUNHA: 'intimacao_testemunha',
  RESPONSAVEL: 'intimacao_responsavel'
};

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function resolveTemplateName(personType) {
  const mapped = TEMPLATE_BY_PERSON_TYPE[personType];
  return mapped || env.whatsapp.defaultTemplateName;
}

function buildSummonsLink(token) {
  if (!env.whatsapp.publicBaseUrl) {
    const error = new Error('WHATSAPP_PUBLIC_BASE_URL nao configurado.');
    error.statusCode = 500;
    throw error;
  }

  const baseUrl = env.whatsapp.publicBaseUrl.replace(/\/$/, '');
  return `${baseUrl}/intimacao?token=${encodeURIComponent(token)}`;
}

function validateSendInput(payload) {
  const summonsId = Number(payload.summonsId);
  const token = String(payload.token || '').trim();

  if (!Number.isInteger(summonsId) || summonsId <= 0) {
    const error = new Error('summonsId invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (!token) {
    const error = new Error('token da intimacao e obrigatorio para envio no link.');
    error.statusCode = 400;
    throw error;
  }

  return {
    summonsId,
    token,
    phoneOverride: payload.phone || null
  };
}

async function sendSummonsMessage(payload) {
  const input = validateSendInput(payload);
  const summons = await summonsRepository.findByIdWithPerson(input.summonsId);

  if (!summons) {
    const error = new Error('Intimacao nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const phone = normalizePhone(input.phoneOverride || summons.personPhone);
  if (!phone) {
    const error = new Error('Telefone da pessoa nao encontrado para envio de WhatsApp.');
    error.statusCode = 422;
    throw error;
  }

  const templateName = resolveTemplateName(summons.personType);
  const link = buildSummonsLink(input.token);

  const body = {
    to: phone,
    channel: 'whatsapp',
    template: templateName,
    variables: {
      nome: summons.personName,
      tipo: summons.personType,
      texto: summons.summonsText,
      link
    },
    message: `${summons.summonsText} Acesse: ${link}`
  };

  const providerResponse = await whatsappClient.sendTemplateMessage(body);

  await summonsRepository.markAsSent(input.summonsId, 'whatsapp');

  return {
    summonsId: summons.id,
    person: {
      id: summons.personId,
      name: summons.personName,
      phone
    },
    template: templateName,
    link,
    providerResponse
  };
}

module.exports = {
  sendSummonsMessage
};
