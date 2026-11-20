/**
 * Staff Routes
 * 
 * Endpoints restricted strictly to users with the 'staff' role.
 */

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const resourceController = require('../controllers/resourceController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All staff routes require both authentication and the 'staff' role
router.use(verifyToken);
router.use(requireRole('staff'));

// Ping endpoint to verify RBAC enforcement
router.get('/ping', staffController.pingStaff);

// Staff management view of all resources (all statuses + filters + pagination)
router.get('/resources', resourceController.getStaffResources);

module.exports = router;
