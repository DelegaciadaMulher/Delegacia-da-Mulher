const { Router } = require('express');
const summonsController = require('../controllers/summonsController');

const router = Router();

router.post('/generate', summonsController.generate);
router.post('/send-whatsapp', summonsController.sendWhatsapp);

module.exports = router;
