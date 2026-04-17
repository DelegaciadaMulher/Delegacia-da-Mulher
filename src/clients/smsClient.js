const axios = require('axios');
const env = require('../config/env');

async function sendSms(payload) {
  if (!env.sms.apiUrl) {
    const error = new Error('SMS_API_URL nao configurado.');
    error.statusCode = 500;
    throw error;
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (env.sms.apiToken) {
    headers.Authorization = `Bearer ${env.sms.apiToken}`;
  }

  const response = await axios.post(env.sms.apiUrl, payload, {
    timeout: 15000,
    headers
  });

  return response.data;
}

module.exports = {
  sendSms
};
