/**
 * Authentication Routes
 * 
 * Defines endpoints for registration, login, profile inspection, and profile editing.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
} = require('../middleware/validate');

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes (requires valid JWT)
router.get('/me', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, validateProfileUpdate, authController.updateProfile);

module.exports = router;
