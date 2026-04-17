const { Router } = require('express');
const uploadPdf = require('../middlewares/uploadPdf');
const pdfController = require('../controllers/pdfController');

const router = Router();

router.post('/upload', uploadPdf.single('file'), pdfController.uploadAndExtract);
router.post(
	'/import-pair',
	uploadPdf.fields([
		{ name: 'bo', maxCount: 1 },
		{ name: 'extrato', maxCount: 1 }
	]),
	pdfController.importPair
);

module.exports = router;
