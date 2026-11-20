/**
 * Staff Routes
 * 
 * Endpoints restricted strictly to users with the 'staff' role.
 */

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All staff routes require both authentication and the 'staff' role
router.use(verifyToken);
router.use(requireRole('staff'));

// Ping endpoint to verify RBAC enforcement
router.get('/ping', staffController.pingStaff);

module.exports = router;
