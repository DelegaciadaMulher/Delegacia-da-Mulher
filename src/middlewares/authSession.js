const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authRepository = require('../repositories/authRepository');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

async function requireSession(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      const error = new Error('Token de sessao nao informado.');
      error.statusCode = 401;
      throw error;
    }

    if (!env.auth.sessionSecret) {
      const error = new Error('JWT_SESSION_SECRET nao configurado.');
      error.statusCode = 500;
      throw error;
    }

    const payload = jwt.verify(token, env.auth.sessionSecret);

    if (!payload || payload.scope !== 'session' || !payload.jti) {
      const error = new Error('Token de sessao invalido.');
      error.statusCode = 401;
      throw error;
    }

    if (env.auth.devMode && payload.role === 'admin') {
      req.auth = {
        userId: payload.userId,
        role: payload.role,
        sessionJti: payload.jti,
        sessionId: 0,
        mocked: true
      };
      next();
      return;
    }

    const session = await authRepository.findActiveSessionByJti(payload.jti);
    if (!session) {
      const error = new Error('Sessao expirada, revogada ou inexistente.');
      error.statusCode = 401;
      throw error;
    }

    req.auth = {
      userId: payload.userId,
      role: payload.role,
      sessionJti: payload.jti,
      sessionId: session.id
    };

    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = 'Falha na autenticacao da sessao.';
    }

    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    const error = new Error('Acesso restrito a administradores.');
    error.statusCode = 403;
    next(error);
    return;
  }

  next();
}

module.exports = {
  requireSession,
  requireAdmin
};
