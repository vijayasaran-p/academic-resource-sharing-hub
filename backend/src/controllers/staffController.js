/**
 * Staff Controller
 * 
 * Handles staff-specific administrative actions.
 * Used here to demonstrate RBAC route protection.
 */

/**
 * Ping test endpoint for staff members
 * Demonstrates successful authorization for staff users.
 */
function pingStaff(req, res) {
  return res.status(200).json({
    success: true,
    message: `Staff route ping successful. Welcome, ${req.user.email}!`,
    data: {
      staff_id: req.user.id,
      role: req.user.role,
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  pingStaff,
};
