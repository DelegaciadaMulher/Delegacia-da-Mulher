const { Router } = require('express');
const schedulingController = require('../controllers/schedulingController');

const router = Router();

router.post('/availability/generate', schedulingController.generateAvailability);
router.get('/availability', schedulingController.listAvailability);
router.post('/appointments', schedulingController.bookAppointment);
router.post('/appointments/confirm-attendance', schedulingController.confirmAttendance);

module.exports = router;
