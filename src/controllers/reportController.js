const reportService = require('../services/reportService');

async function create(req, res, next) {
  try {
    const report = await reportService.createReport(req.body);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const reports = await reportService.listReports();
    res.status(200).json(reports);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list
};
