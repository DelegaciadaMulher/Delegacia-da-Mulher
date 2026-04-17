const { Router } = require('express');
const adminDashboardController = require('../controllers/adminDashboardController');
const { requireSession, requireAdmin } = require('../middlewares/authSession');

const router = Router();

router.use(requireSession, requireAdmin);
router.get('/overview', adminDashboardController.getOverview);
router.get('/pending-cases', adminDashboardController.getPendingCases);

module.exports = router;
