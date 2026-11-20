/**
 * Authentication Controller
 * 
 * Handles user registration (student only), authentication (JWT login),
 * profile retrieval, and profile updates.
 * All queries use parameterized statements to prevent SQL injection.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');

/**
 * Register a new student
 * Role is strictly enforced as 'student' server-side.
 */
async function register(req, res, next) {
  try {
    const { name, email, password, department_id } = req.body;

    // 1. Verify department exists in the database
    const [deptRows] = await pool.query(
      'SELECT id, name FROM departments WHERE id = ?',
      [department_id]
    );

    if (deptRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Department with ID ${department_id} does not exist.`,
      });
    }

    // 2. Check if email is already registered
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // 3. Hash password securely using bcrypt (10 rounds salt)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert student into database (role is HARDCODED to 'student')
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department_id)
       VALUES (?, ?, ?, 'student', ?)`,
      [name, email, passwordHash, department_id]
    );

    // 5. Respond with created user details (excluding password hash)
    return res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      data: {
        user: {
          id: result.insertId,
          name,
          email,
          role: 'student',
          department_id,
          department_name: deptRows[0].name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user (Student or Staff)
 * Verifies credentials and generates a signed JWT.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // 1. Fetch user by email
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];

    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Generate JWT payload and token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    // 4. Return JWT and user info (omitting password_hash)
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department_id: user.department_id,
          department_name: user.department_name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user profile
 * Protected route: uses req.user.id populated by verifyToken
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name AS department_name, u.created_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update authenticated user profile (name and department)
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, department_id } = req.body;

    if (!name && !department_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update (name or department_id).',
      });
    }

    // If department_id is being updated, verify it exists
    if (department_id) {
      const [deptRows] = await pool.query(
        'SELECT id FROM departments WHERE id = ?',
        [department_id]
      );

      if (deptRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Department with ID ${department_id} does not exist.`,
        });
      }
    }

    // Update fields using COALESCE so null/undefined leaves existing value untouched
    await pool.query(
      `UPDATE users
       SET name = COALESCE(?, name),
           department_id = COALESCE(?, department_id)
       WHERE id = ?`,
      [name || null, department_id || null, userId]
    );

    // Fetch refreshed user record
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name AS department_name, u.created_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
