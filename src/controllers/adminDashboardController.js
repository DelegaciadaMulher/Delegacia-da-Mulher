const adminDashboardService = require('../services/adminDashboardService');

async function getOverview(req, res, next) {
  try {
    const result = await adminDashboardService.getDashboardOverview();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getPendingCases(req, res, next) {
  try {
    const result = await adminDashboardService.getPendingCasesList();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getPendingCases
};
