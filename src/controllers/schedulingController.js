const schedulingService = require('../services/schedulingService');

async function generateAvailability(req, res, next) {
  try {
    const result = await schedulingService.generateAvailability(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listAvailability(req, res, next) {
  try {
    const result = await schedulingService.listAvailability(req.query.date);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function bookAppointment(req, res, next) {
  try {
    const result = await schedulingService.bookAppointment(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function confirmAttendance(req, res, next) {
  try {
    const result = await schedulingService.confirmAttendance(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generateAvailability,
  listAvailability,
  bookAppointment,
  confirmAttendance
};
