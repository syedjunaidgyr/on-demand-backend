const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Generate JWT token with theme data
const generateToken = async (userId, role) => {
  // Get user's effective theme
  const user = await User.findByPk(userId, {
    attributes: ['id', 'selectedThemeId', 'hospitalId']
  });
  
  let activeTheme = null;
  if (user) {
    activeTheme = await user.getEffectiveTheme();
  }
  
  // Include theme ID in token payload for frontend
  const payload = { 
    userId, 
    role,
    themeId: user?.selectedThemeId || null
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Generate token without theme (for backward compatibility)
const generateTokenSync = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    // Find user and check if active
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found or inactive'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Access denied',
      message: error.message
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    // Admin has access to everything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Check if user can access resource
const canAccessResource = (req, res, next) => {
  const resourceUserId = parseInt(req.params.userId || req.params.id);
  
  // Admin has access to all resources
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // HR can access all resources
  if (req.user.role === 'HR') {
    return next();
  }

  // Users can only access their own resources
  if (req.user.id === resourceUserId) {
    return next();
  }

  return res.status(403).json({
    error: 'Access denied',
    message: 'You can only access your own resources'
  });
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await User.findByPk(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
      req.userId = user.id;
      req.userRole = user.role;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  generateToken,
  generateTokenSync,
  verifyToken,
  authenticate,
  authorize,
  canAccessResource,
  optionalAuth
};
