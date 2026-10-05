const express = require('express');
const {
  getWeeklyAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} = require('../controllers/salonAvailabilityController');
const authenticate = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();
const requireAdmin = [authenticate, allowRoles('admin')];

router.get('/', getWeeklyAvailability);
router.post('/', ...requireAdmin, createAvailability);
router.put('/:id', ...requireAdmin, updateAvailability);
router.delete('/:id', ...requireAdmin, deleteAvailability);

module.exports = router;
