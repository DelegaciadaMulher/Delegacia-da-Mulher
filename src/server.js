const app = require('./app');
const env = require('./config/env');
const pool = require('./config/database');

function isDbUnavailableError(error) {
  const code = String(error && error.code ? error.code : '').toUpperCase();
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT';
}

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('Conectado ao PostgreSQL com sucesso.');

    app.listen(env.port, () => {
      console.log(`Servidor rodando na porta ${env.port}`);
    });
  } catch (error) {
    if (env.auth.devMode && isDbUnavailableError(error)) {
      console.warn('Banco indisponivel. Subindo em modo degradado (dev mode).');
      app.listen(env.port, () => {
        console.log(`Servidor rodando na porta ${env.port}`);
      });
      return;
    }

    console.error('Falha ao iniciar aplicação:', error.message);
    process.exit(1);
  }
}

startServer();
