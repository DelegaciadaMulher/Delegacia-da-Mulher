const pdfService = require('../services/pdfService');
const pairImportService = require('../services/pairImportService');

async function uploadAndExtract(req, res, next) {
  try {
    const result = await pdfService.processPdfUpload(req.file);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function importPair(req, res, next) {
  try {
    const result = await pairImportService.importBoAndExtratoPair(req.files);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadAndExtract,
  importPair
};
