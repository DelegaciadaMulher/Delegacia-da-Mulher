const summonsService = require('../services/summonsService');
const whatsappService = require('../services/whatsappService');

async function generate(req, res, next) {
  try {
    const result = await summonsService.generateSummons(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function sendWhatsapp(req, res, next) {
  try {
    const result = await whatsappService.sendSummonsMessage(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generate,
  sendWhatsapp
};
