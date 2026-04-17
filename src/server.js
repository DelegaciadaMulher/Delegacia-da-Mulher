const app = require('./app');
const env = require('./config/env');
const pool = require('./config/database');

function isDbUnavailableError(error) {
  const code = String(error && error.code ? error.code : '').toUpperCase();
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT';
}

async function startServer() {
  console.warn('Modo simulação ativado. Subindo sem verificar banco.');

  app.listen(env.port, () => {
    console.log(`Servidor rodando na porta ${env.port}`);
  });
}

startServer();
