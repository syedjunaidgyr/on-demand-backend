const express = require('express');
const { User } = require('../models');
const { generateToken, authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { sendNotifications } = require('../utils/notifications');

const router = express.Router();

// Register new user
router.post('/register', validate(schemas.userRegistration), async (req, res) => {
  try {
    const { email, password, confirmPassword, firstName, lastName, role, ...otherData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }

    // Create new user (confirmPassword is excluded from database save)
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      ...otherData
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login user
router.post('/login', validate(schemas.userLogin), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact HR.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticate, validate(schemas.userUpdate), async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Update user data
    await user.update(req.body);

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: error.message
    });
  }
});

// Change password
router.put('/change-password', authenticate, validate(schemas.passwordChange), async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

  // Update password (confirmPassword is excluded from database save)
  user.password = newPassword;
  await user.save();

  // Send security notification
  try {
    await sendNotifications('PasswordChanged_User', [{
      userId: String(user.id),
      userType: (user.role || '').toLowerCase(),
      placeholders: { changedAt: new Date().toISOString() }
    }]);
    // Admin/HR audit copy
    await sendNotifications('PasswordChanged_AdminAudit', [{
      userId: String(user.id),
      userType: 'hr',
      placeholders: { email: user.email, changedAt: new Date().toISOString() }
    }]);
  } catch (e) {}

  res.json({
    message: 'Password changed successfully'
  });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: error.message
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    message: 'Logout successful'
  });
});

// Refresh token
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

module.exports = router;
