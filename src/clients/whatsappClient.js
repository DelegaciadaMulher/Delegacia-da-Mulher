const axios = require('axios');
const env = require('../config/env');

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeMetaCloudPhone(phone) {
  const digits = normalizePhone(phone);

  if (!digits) {
    return '';
  }

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function resolveApiUrl() {
  if (env.whatsapp.provider === 'meta-cloud') {
    if (env.whatsapp.apiUrl) {
      return env.whatsapp.apiUrl;
    }

    if (!env.whatsapp.phoneNumberId) {
      const error = new Error('WHATSAPP_PHONE_NUMBER_ID nao configurado para Meta Cloud API.');
      error.statusCode = 500;
      throw error;
    }

    return `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
  }

  if (!env.whatsapp.apiUrl) {
    const error = new Error('WHATSAPP_API_URL nao configurado.');
    error.statusCode = 500;
    throw error;
  }

  return env.whatsapp.apiUrl;
}

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (env.whatsapp.apiToken) {
    if (env.whatsapp.provider === 'meta-cloud') {
      headers.Authorization = `Bearer ${env.whatsapp.apiToken}`;
    } else {
      headers['Client-Token'] = `${env.whatsapp.apiToken}`;
    }
  }

  return headers;
}

function buildMetaTemplateComponents(variables) {
  const entries = Object.values(variables || {});
  if (!entries.length) {
    return undefined;
  }

  return [
    {
      type: 'body',
      parameters: entries.map((value) => ({
        type: 'text',
        text: String(value == null ? '' : value)
      }))
    }
  ];
}

function buildMetaCloudPayload(payload) {
  const to = normalizeMetaCloudPhone(payload.to);
  if (!to) {
    const error = new Error('Telefone de destino invalido para envio no WhatsApp.');
    error.statusCode = 422;
    throw error;
  }

  if (payload.template) {
    const components = buildMetaTemplateComponents(payload.variables);
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: payload.template,
        language: {
          code: env.whatsapp.languageCode
        },
        ...(components ? { components } : {})
      }
    };
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body: String(payload.message || '')
    }
  };
}

async function sendTemplateMessage(payload) {
  const apiUrl = resolveApiUrl();
  const body = env.whatsapp.provider === 'meta-cloud'
    ? buildMetaCloudPayload(payload)
    : payload;

  const response = await axios.post(apiUrl, body, {
    timeout: 15000,
    headers: buildHeaders()
  });

  return response.data;
}

module.exports = {
  sendTemplateMessage
};
