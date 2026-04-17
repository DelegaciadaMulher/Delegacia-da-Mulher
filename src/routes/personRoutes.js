const { Router } = require('express');
const personController = require('../controllers/personController');

const router = Router();

router.post('/upsert', personController.upsert);

module.exports = router;
