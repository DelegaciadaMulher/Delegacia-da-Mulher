const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    summonsSecret: process.env.JWT_SUMMONS_SECRET || '',
    summonsExpiresIn: process.env.JWT_SUMMONS_EXPIRES_IN || '72h'
  },
  auth: {
    otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
    sessionSecret: process.env.JWT_SESSION_SECRET || '',
    sessionExpiresIn: process.env.JWT_SESSION_EXPIRES_IN || '12h',
    devMode: process.env.AUTH_DEV_MODE === 'true',
    devAdminCpf: process.env.AUTH_DEV_ADMIN_CPF || '40280221851'
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    defaultTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || 'intimacao_padrao',
    otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp_login',
    victimNotificationTemplateName: process.env.WHATSAPP_VICTIM_NOTIFICATION_TEMPLATE_NAME || 'notificacao_vitima',
    publicBaseUrl: process.env.WHATSAPP_PUBLIC_BASE_URL || ''
  },
  sms: {
    apiUrl: process.env.SMS_API_URL || '',
    apiToken: process.env.SMS_API_TOKEN || ''
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'delegacia_mulher',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true'
  }
};

module.exports = env;
