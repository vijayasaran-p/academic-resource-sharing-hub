/**
 * Authentication and RBAC (Role-Based Access Control) Middleware
 * 
 * - verifyToken: Validates incoming Bearer JWT and extracts user payload.
 * - requireRole: Restricts access to specific roles ('student', 'staff').
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware: Verify Bearer JWT Token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check for presence of Authorization header in format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    // Attach decoded user info { id, email, role } to the request object
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
}

/**
 * Middleware: Role-Based Authorization
 * @param  {...string} allowedRoles Roles permitted to access the route ('student', 'staff')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before permission check.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] role. Current role: '${req.user.role}'`,
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
};
