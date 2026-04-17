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
    const result = await schedulingService.listAvailability(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function listAvailabilityOptions(req, res, next) {
  try {
    const result = await schedulingService.listAvailabilityOptions(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getVictimAttendanceContext(req, res, next) {
  try {
    const result = await schedulingService.getVictimAttendanceContext(req.query);

    if (!result) {
      res.status(404).json({ error: 'BO nao encontrado para atendimento da vitima.' });
      return;
    }

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
  listAvailabilityOptions,
  getVictimAttendanceContext,
  bookAppointment,
  confirmAttendance
};
