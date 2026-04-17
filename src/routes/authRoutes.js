const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/admin/request-otp', authController.requestAdminOtp);
router.post('/admin/verify-otp', authController.verifyAdminOtp);

module.exports = router;
