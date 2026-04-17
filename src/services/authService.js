const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const authRepository = require('../repositories/authRepository');
const smsClient = require('../clients/smsClient');
const whatsappClient = require('../clients/whatsappClient');

const devOtpStore = new Map();

function normalizeCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

function normalizeChannel(channel) {
  return String(channel || '').trim().toLowerCase();
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function ensureSessionSecret() {
  if (!env.auth.sessionSecret) {
    const error = new Error('JWT_SESSION_SECRET nao configurado.');
    error.statusCode = 500;
    throw error;
  }
}

function buildOtpDeliveryMessage(code) {
  return `Seu codigo de acesso da Delegacia da Mulher: ${code}. Nao compartilhe.`;
}

async function deliverOtp({ phone, channel, code }) {
  const message = buildOtpDeliveryMessage(code);

  if (channel === 'sms') {
    return smsClient.sendSms({
      to: phone,
      message
    });
  }

  if (channel === 'whatsapp') {
    return whatsappClient.sendTemplateMessage({
      to: phone,
      channel: 'whatsapp',
      template: env.whatsapp.otpTemplateName,
      variables: {
        code
      },
      message
    });
  }

  const error = new Error('Canal invalido. Use sms ou whatsapp.');
  error.statusCode = 400;
  throw error;
}

async function requestOtp(payload) {
  const cpf = normalizeCpf(payload.cpf);
  const channel = normalizeChannel(payload.channel);

  if (!cpf || cpf.length !== 11) {
    const error = new Error('CPF invalido. Informe 11 digitos.');
    error.statusCode = 400;
    throw error;
  }

  if (channel !== 'sms' && channel !== 'whatsapp') {
    const error = new Error('Canal invalido. Use sms ou whatsapp.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findActiveUserByCpf(cpf);
  if (!user) {
    const error = new Error('Usuario ativo nao encontrado para o CPF informado.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.phone) {
    const error = new Error('Telefone da pessoa nao cadastrado para envio de OTP.');
    error.statusCode = 422;
    throw error;
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.auth.otpExpiresMinutes * 60 * 1000);

  await authRepository.createAuthCode({
    userId: user.id,
    codeHash: hashText(code),
    codeType: 'login_otp',
    expiresAt
  });

  const providerResponse = await deliverOtp({
    phone: user.phone,
    channel,
    code
  });

  return {
    userId: user.id,
    channel,
    expiresAt: expiresAt.toISOString(),
    providerResponse
  };
}

function ensureAdminUser(user) {
  if (!user || user.role !== 'admin') {
    const error = new Error('Acesso permitido apenas para usuario administrador.');
    error.statusCode = 403;
    throw error;
  }
}

async function requestAdminOtp(payload) {
  const cpf = normalizeCpf(payload.cpf);
  const channel = normalizeChannel(payload.channel);

  if (channel !== 'whatsapp') {
    const error = new Error('Login administrativo exige canal whatsapp.');
    error.statusCode = 400;
    throw error;
  }

  if (env.auth.devMode) {
    if (cpf !== normalizeCpf(env.auth.devAdminCpf)) {
      const error = new Error('CPF sem permissao de admin no modo de desenvolvimento.');
      error.statusCode = 403;
      throw error;
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.auth.otpExpiresMinutes * 60 * 1000);
    devOtpStore.set(cpf, {
      codeHash: hashText(code),
      expiresAt,
      used: false
    });

    return {
      userId: 0,
      channel: 'whatsapp',
      expiresAt: expiresAt.toISOString(),
      providerResponse: { mocked: true, message: 'OTP gerado em modo de desenvolvimento.' },
      devOtpCode: code
    };
  }

  const user = await authRepository.findActiveUserByCpf(cpf);
  ensureAdminUser(user);

  return requestOtp({ cpf, channel: 'whatsapp' });
}

async function verifyOtp(payload) {
  ensureSessionSecret();

  const cpf = normalizeCpf(payload.cpf);
  const code = String(payload.code || '').trim();
  const channel = normalizeChannel(payload.channel);

  if (!cpf || cpf.length !== 11) {
    const error = new Error('CPF invalido. Informe 11 digitos.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{6}$/.test(code)) {
    const error = new Error('Codigo OTP invalido. Informe 6 digitos.');
    error.statusCode = 400;
    throw error;
  }

  if (channel !== 'sms' && channel !== 'whatsapp') {
    const error = new Error('Canal invalido. Use sms ou whatsapp.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findActiveUserByCpf(cpf);
  if (!user) {
    const error = new Error('Usuario ativo nao encontrado para o CPF informado.');
    error.statusCode = 404;
    throw error;
  }

  const authCode = await authRepository.findLatestValidAuthCode({
    userId: user.id,
    codeType: 'login_otp'
  });

  if (!authCode) {
    const error = new Error('Codigo OTP expirado ou inexistente. Solicite novo codigo.');
    error.statusCode = 401;
    throw error;
  }

  if (authCode.code !== hashText(code)) {
    const error = new Error('Codigo OTP invalido.');
    error.statusCode = 401;
    throw error;
  }

  await authRepository.markAuthCodeUsed(authCode.id);

  const sessionJti = crypto.randomUUID();
  const token = jwt.sign(
    {
      scope: 'session',
      userId: user.id,
      personId: user.personId,
      cpf: user.cpf,
      role: user.role,
      channel
    },
    env.auth.sessionSecret,
    {
      expiresIn: env.auth.sessionExpiresIn,
      jwtid: sessionJti
    }
  );

  const decoded = jwt.decode(token);
  const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    const error = new Error('Falha ao calcular expiracao da sessao.');
    error.statusCode = 500;
    throw error;
  }

  const session = await authRepository.createUserSession({
    userId: user.id,
    sessionJti,
    tokenHash: hashText(token),
    channel,
    expiresAt
  });

  return {
    session,
    accessToken: token,
    tokenType: 'Bearer',
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      personId: user.personId,
      fullName: user.fullName,
      cpf: user.cpf,
      email: user.email,
      role: user.role
    }
  };
}

async function verifyAdminOtp(payload) {
  const cpf = normalizeCpf(payload.cpf);
  const channel = normalizeChannel(payload.channel);

  if (channel !== 'whatsapp') {
    const error = new Error('Login administrativo exige canal whatsapp.');
    error.statusCode = 400;
    throw error;
  }

  if (env.auth.devMode) {
    ensureSessionSecret();

    if (cpf !== normalizeCpf(env.auth.devAdminCpf)) {
      const error = new Error('CPF sem permissao de admin no modo de desenvolvimento.');
      error.statusCode = 403;
      throw error;
    }

    const record = devOtpStore.get(cpf);
    if (!record || record.used || record.expiresAt.getTime() <= Date.now()) {
      const error = new Error('Codigo OTP expirado ou inexistente. Solicite novo codigo.');
      error.statusCode = 401;
      throw error;
    }

    if (record.codeHash !== hashText(String(payload.code || '').trim())) {
      const error = new Error('Codigo OTP invalido.');
      error.statusCode = 401;
      throw error;
    }

    record.used = true;
    devOtpStore.set(cpf, record);

    const sessionJti = crypto.randomUUID();
    const token = jwt.sign(
      {
        scope: 'session',
        userId: 0,
        personId: 0,
        cpf,
        role: 'admin',
        channel: 'whatsapp'
      },
      env.auth.sessionSecret,
      {
        expiresIn: env.auth.sessionExpiresIn,
        jwtid: sessionJti
      }
    );

    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;

    return {
      session: {
        id: 0,
        userId: 0,
        sessionJti,
        channel: 'whatsapp',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        mocked: true
      },
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      user: {
        id: 0,
        personId: 0,
        fullName: 'Admin Desenvolvimento',
        cpf,
        email: null,
        role: 'admin'
      }
    };
  }

  const user = await authRepository.findActiveUserByCpf(cpf);
  ensureAdminUser(user);

  const result = await verifyOtp({
    cpf,
    code: payload.code,
    channel: 'whatsapp'
  });

  if (result.user.role !== 'admin') {
    const error = new Error('Acesso permitido apenas para usuario administrador.');
    error.statusCode = 403;
    throw error;
  }

  return result;
}

module.exports = {
  requestOtp,
  verifyOtp,
  requestAdminOtp,
  verifyAdminOtp
};
