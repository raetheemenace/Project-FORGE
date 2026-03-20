const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db/pool');
const oracledb = require('oracledb');

const router = express.Router();

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, PROGRAM, ROLE, STUDENT_ID
       FROM FORGE_USERS WHERE USERNAME = :username`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId:    user.USER_ID,
        studentId: user.STUDENT_ID,
        username:  user.USERNAME,
        fullName:  user.FULL_NAME,
        program:   user.PROGRAM,
        role:      user.ROLE,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.ROLE, fullName: user.FULL_NAME });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { fullName, studentId, username, password, program } = req.body;

  if (!fullName || !studentId || !username || !password) {
    return res.status(400).json({ error: 'Full name, student ID, username, and password are required' });
  }

  // Validate student ID: exactly 7 numeric digits
  if (!/^\d{7}$/.test(studentId)) {
    return res.status(400).json({ error: 'Student ID must be exactly 7 numeric digits' });
  }

  let conn;
  try {
    conn = await getConnection();

    // Check username uniqueness
    const existing = await conn.execute(
      `SELECT USER_ID FROM FORGE_USERS WHERE USERNAME = :username`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await conn.execute(
      `INSERT INTO FORGE_USERS (STUDENT_ID, USERNAME, PASSWORD_HASH, FULL_NAME, PROGRAM, ROLE)
       VALUES (:studentId, :username, :passwordHash, :fullName, :program, 'STUDENT')`,
      { studentId, username, passwordHash, fullName, program: program || null }
    );
    await conn.commit();

    // Fetch the new user to build JWT
    const newUser = await conn.execute(
      `SELECT USER_ID, FULL_NAME, PROGRAM, ROLE, STUDENT_ID
       FROM FORGE_USERS WHERE USERNAME = :username`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const u = newUser.rows[0];

    const token = jwt.sign(
      {
        userId:    u.USER_ID,
        studentId: u.STUDENT_ID,
        username,
        fullName:  u.FULL_NAME,
        program:   u.PROGRAM,
        role:      u.ROLE,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({ token, role: u.ROLE, fullName: u.FULL_NAME });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
