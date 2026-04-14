// JWT Authentication Middleware
const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and extract user information
 * Adds user data to req.user if token is valid
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.' 
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      studentId: decoded.studentId,
      role: decoded.role,
      fullName: decoded.fullName,
      program: decoded.program
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please sign in again.' 
      });
    }
    
    return res.status(403).json({ 
      error: 'Invalid token.' 
    });
  }
}

/**
 * Middleware to check if user has required role
 * @param {string} requiredRole - Role required to access the route
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.' 
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions.' 
      });
    }

    next();
  };
}

/**
 * Generate JWT token for user
 * @param {object} user - User object with userId, studentId, role, fullName, program
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.userId || user.user_id,
    studentId: user.studentId || user.student_id,
    role: user.role,
    fullName: user.fullName || user.full_name,
    program: user.program
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '24h'
  });
}

module.exports = {
  authenticateToken,
  requireRole,
  generateToken
};
