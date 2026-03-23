// Authentication Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/pool');
const { generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/signup
 * Register a new student account
 */
router.post('/signup', async (req, res) => {
  const { studentId, username, password, fullName, program } = req.body;

  try {
    // Validate required fields
    if (!studentId || !username || !password || !fullName) {
      return res.status(400).json({
        error: 'All fields are required: studentId, username, password, fullName'
      });
    }

    // Validate Student ID format (exactly 7 numeric digits)
    if (!/^\d{7}$/.test(studentId)) {
      return res.status(400).json({
        error: 'Student ID must be exactly 7 numeric digits'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.query(
      `INSERT INTO forge_users (student_id, username, password_hash, full_name, program, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, student_id, username, full_name, program, role, created_at`,
      [studentId, username, passwordHash, fullName, program || null, 'STUDENT']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken({
      userId: user.user_id,
      studentId: user.student_id,
      role: user.role,
      fullName: user.full_name,
      program: user.program
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        userId: user.user_id,
        studentId: user.student_id,
        username: user.username,
        fullName: user.full_name,
        program: user.program,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') { // PostgreSQL unique violation
      if (error.constraint === 'forge_users_username_key') {
        return res.status(409).json({
          error: 'Username already exists'
        });
      }
      if (error.constraint === 'forge_users_student_id_key') {
        return res.status(409).json({
          error: 'Student ID already registered'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to create account'
    });
  }
});

/**
 * POST /api/auth/signin
 * Authenticate user and return JWT token
 */
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Find user by username
    const result = await db.query(
      `SELECT user_id, student_id, username, password_hash, full_name, program, role
       FROM forge_users
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.user_id,
      studentId: user.student_id,
      role: user.role,
      fullName: user.full_name,
      program: user.program
    });

    res.json({
      message: 'Sign in successful',
      token,
      user: {
        userId: user.user_id,
        studentId: user.student_id,
        username: user.username,
        fullName: user.full_name,
        program: user.program,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      error: 'Failed to sign in'
    });
  }
});

module.exports = router;
