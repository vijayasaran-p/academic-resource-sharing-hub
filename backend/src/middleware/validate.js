/**
 * Request Validation Middleware using express-validator
 * 
 * Defines sanitization and validation chains for auth endpoints
 * and inspects validation results before passing control to controllers.
 */

const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return formatted error messages
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
}

/**
 * Validation rules for student registration
 * - Name: Required, 2-100 characters
 * - Email: Valid email format, normalized
 * - Password: Minimum 8 characters
 * - Department ID: Valid integer >= 1
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  
  body('department_id')
    .notEmpty().withMessage('Department ID is required')
    .isInt({ min: 1 }).withMessage('Department ID must be a valid positive integer'),

  handleValidationErrors,
];

/**
 * Validation rules for user login (student or staff)
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

/**
 * Validation rules for updating user profile
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('department_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Department ID must be a valid positive integer'),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
};
