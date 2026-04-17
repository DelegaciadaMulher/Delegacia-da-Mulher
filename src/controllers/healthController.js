const pool = require('../config/database');

async function getHealth(req, res, next) {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'ok',
      service: 'delegacia-da-mulher-api',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth
};
