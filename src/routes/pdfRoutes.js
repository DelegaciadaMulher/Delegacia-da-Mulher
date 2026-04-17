const { Router } = require('express');
const uploadPdf = require('../middlewares/uploadPdf');
const pdfController = require('../controllers/pdfController');
const { requireSession, requireAdmin } = require('../middlewares/authSession');

const router = Router();

router.post('/upload', uploadPdf.single('file'), pdfController.uploadAndExtract);
router.post(
	'/import-pair',
	requireSession,
	requireAdmin,
	uploadPdf.fields([
		{ name: 'bo', maxCount: 1 },
		{ name: 'extrato', maxCount: 1 }
	]),
	pdfController.importPair
);

module.exports = router;
