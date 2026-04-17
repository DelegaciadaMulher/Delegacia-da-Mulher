const axios = require('axios');
const env = require('../config/env');

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (env.whatsapp.apiToken) {
    headers["Client-Token"] = `${env.whatsapp.apiToken}`;
  }

  return headers;
}

async function sendTemplateMessage(payload) {
  if (!env.whatsapp.apiUrl) {
    const error = new Error('WHATSAPP_API_URL nao configurado.');
    error.statusCode = 500;
    throw error;
  }

  const response = await axios.post(env.whatsapp.apiUrl, payload, {
    timeout: 15000,
    headers: buildHeaders()
  });

  return response.data;
}

module.exports = {
  sendTemplateMessage
};
