const express = require('express');
const {
  listActiveServices,
  getActiveService,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const authenticate = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();
const requireAdmin = [authenticate, allowRoles('admin')];

router.get('/', listActiveServices);
router.get('/:id', getActiveService);
router.post('/', ...requireAdmin, createService);
router.put('/:id', ...requireAdmin, updateService);
router.delete('/:id', ...requireAdmin, deleteService);

module.exports = router;
