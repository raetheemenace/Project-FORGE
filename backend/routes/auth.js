// Authentication Routes — POST /api/auth/signup, /api/auth/signin
// Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 2.6

const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Validation helpers
function validateStudentId(studentId) {
  return /^\d{7,8}$/.test(studentId);
}

function validateTipEmail(email) {
  return /^m[a-zA-Z0-9._%+-]*@tip\.edu\.ph$/.test(email) || 
         /^q[a-zA-Z0-9._%+-]*@tip\.edu\.ph$/.test(email);
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup — Register new user
// ---------------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  const { studentId, fullName, program, tipEmail } = req.body;

  // Validate required fields
  if (!studentId || !fullName || !program || !tipEmail) {
    return res.status(400).json({ 
      error: 'All fields are required: studentId, fullName, program, tipEmail' 
    });
  }

  // Validate studentId format (7-8digits)
  if (!validateStudentId(studentId)) {
    return res.status(400).json({ 
      error: 'Student ID must be exactly 7-8 numeric digits' 
    });
  }

  // Validate TIP email format
  if (!validateTipEmail(tipEmail)) {
    return res.status(400).json({ 
      error: 'Must be a valid TIP Email (e.g. mjdelacruz@tip.edu.ph)' 
    });
  }

  try {
    // Check if student already exists
    const existingUser = await db.query(
      'SELECT user_id FROM forge_users WHERE student_id = $1',
      [studentId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Student ID already registered' });
    }

    // Create new user
    const result = await db.query(
      `INSERT INTO forge_users (student_id, full_name, program, tip_email, role)
       VALUES ($1, $2, $3, $4, 'STUDENT')
       RETURNING user_id, student_id, full_name, program, role`,
      [studentId, fullName, program, tipEmail]
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
      message: 'Registration successful',
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
    
    // Handle duplicate key error
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Student ID already registered' });
    }
    
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/signin — Authenticate user
// ---------------------------------------------------------------------------
router.post('/signin', async (req, res) => {
  const { tipEmail, studentId } = req.body;

  // Validate required fields
  if (!tipEmail || !studentId) {
    return res.status(400).json({ 
      error: 'TIP Email and Student ID are required' 
    });
  }

  try {
    // Find user by email and studentId
    const result = await db.query(
      `SELECT user_id, student_id, full_name, program, role
       FROM forge_users
       WHERE tip_email = $1 AND student_id = $2`,
      [tipEmail, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — Get current user info (protected)
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT user_id, student_id, full_name, program, role, created_at
       FROM forge_users
       WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      userId: user.user_id,
      studentId: user.student_id,
      fullName: user.full_name,
      program: user.program,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;