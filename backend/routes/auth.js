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
  const { studentId, fullName, program, tipEmail } = req.body;

  try {
    // Validate required fields
    if (!studentId || !fullName || !program) {
      return res.status(400).json({
        error: 'All fields are required: studentId, fullName, program'
      });
    }

    // Validate Student ID format (7-8 numeric digits, or admin IDs like ADMIN01)
    if (!/^\d{7,8}$/.test(studentId) && !/^[A-Z]+\d+$/.test(studentId)) {
      return res.status(400).json({
        error: 'Student ID must be 7-8 numeric digits'
      });
    }

    // Insert new user (no password needed)
    const result = await db.query(
      `INSERT INTO forge_users (student_id, full_name, program, role, tip_email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, student_id, full_name, program, role, tip_email, created_at`,
      [studentId, fullName, program, 'STUDENT', tipEmail || null]
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
        fullName: user.full_name,
        program: user.program,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') { // PostgreSQL unique violation
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
 * Authenticate user with tipEmail and studentId
 */
router.post('/signin', async (req, res) => {
  const { tipEmail, studentId } = req.body;

  try {
    // Validate required fields
    if (!tipEmail || !studentId) {
      return res.status(400).json({
        error: 'TIP email and student ID are required'
      });
    }

    // Find user by tipEmail and studentId
    const result = await db.query(
      `SELECT user_id, student_id, full_name, program, role
       FROM forge_users
       WHERE tip_email = $1 AND student_id = $2`,
      [tipEmail, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

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
