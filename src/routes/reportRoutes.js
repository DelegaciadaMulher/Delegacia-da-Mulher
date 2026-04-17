const { Router } = require('express');
const reportController = require('../controllers/reportController');

const router = Router();

router.post('/', reportController.create);
router.get('/', reportController.list);

module.exports = router;
