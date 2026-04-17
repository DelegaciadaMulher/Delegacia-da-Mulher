const reportRepository = require('../repositories/reportRepository');

function validateReportInput(payload) {
  const { victimName, description, neighborhood } = payload;

  if (!victimName || !description || !neighborhood) {
    const error = new Error('Campos obrigatórios: victimName, description e neighborhood.');
    error.statusCode = 400;
    throw error;
  }
}

async function createReport(payload) {
  validateReportInput(payload);
  return reportRepository.createReport(payload);
}

async function listReports() {
  return reportRepository.listReports();
}

module.exports = {
  createReport,
  listReports
};
