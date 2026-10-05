const express = require('express');
const {
  createAppointment,
  getAvailableTimes,
  getMyAppointments,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelMyAppointment,
} = require('../controllers/appointmentController');
const authenticate = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();
const requireCustomer = [authenticate, allowRoles('customer')];
const requireAdmin = [authenticate, allowRoles('admin')];

router.post('/', ...requireCustomer, createAppointment);
router.get('/availability', ...requireCustomer, getAvailableTimes);
router.get('/my', ...requireCustomer, getMyAppointments);
router.get('/', ...requireAdmin, getAllAppointments);
router.get('/:id', ...requireAdmin, getAppointmentById);
router.patch('/:id/status', ...requireAdmin, updateAppointmentStatus);
router.patch('/:id/cancel', ...requireCustomer, cancelMyAppointment);

module.exports = router;
