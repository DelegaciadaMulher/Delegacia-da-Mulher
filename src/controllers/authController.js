const authService = require('../services/authService');

async function requestOtp(req, res, next) {
  try {
    const result = await authService.requestOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function requestAdminOtp(req, res, next) {
  try {
    const result = await authService.requestAdminOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function verifyAdminOtp(req, res, next) {
  try {
    const result = await authService.verifyAdminOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  requestAdminOtp,
  verifyAdminOtp
};
