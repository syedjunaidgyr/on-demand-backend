const express = require('express');
const { User, Hospital } = require('../models');
const { generateToken, authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { sendNotifications, formatHuman } = require('../utils/notifications');
const { themeExists } = require('../utils/themeHelpers');

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

    // Generate token with theme data
    const token = await generateToken(user.id, user.role);
    
    // Get user's active theme
    const activeTheme = await user.getEffectiveTheme();

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token,
      activeTheme
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
    await user.update({ lastLogin: new Date() });
    await user.reload();

    // Generate token with theme data
    const token = await generateToken(user.id, user.role);
    
    // Get user's active theme
    const activeTheme = await user.getEffectiveTheme();

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token,
      activeTheme
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

    // Get effective theme for the user
    const effectiveTheme = await user.getEffectiveTheme();

    res.json({
      user: user.toJSON(),
      activeTheme: effectiveTheme
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
      placeholders: { changedAt: formatHuman(new Date()) }
    }]);
    // Admin/HR audit copy
    await sendNotifications('PasswordChanged_AdminAudit', [{
      userId: String(user.id),
      userType: 'hr',
      placeholders: { email: user.email, changedAt: formatHuman(new Date()) }
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

// Select theme for current user
router.put('/profile/theme', authenticate, async (req, res) => {
  try {
    const { themeId } = req.body;
    
    if (!themeId) {
      return res.status(400).json({
        error: 'Theme ID required',
        message: 'Please provide a theme ID'
      });
    }
    
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'hospitalId', 'selectedThemeId']
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    
    if (!user.hospitalId) {
      return res.status(400).json({
        error: 'No hospital assigned',
        message: 'You must be assigned to a hospital to select themes'
      });
    }
    
    // Verify theme exists in hospital
    const themeExistsForHospital = await themeExists(user.hospitalId, themeId);
    if (!themeExistsForHospital) {
      return res.status(400).json({
        error: 'Invalid theme',
        message: `Theme "${themeId}" does not exist in your hospital's themes`
      });
    }
    
    // Update user's theme selection
    await user.update({ selectedThemeId: themeId });
    
    // Reload user to get updated data
    await user.reload();
    
    // Generate new token with updated theme
    const token = await generateToken(user.id, user.role);
    
    // Get the effective theme to return
    const effectiveTheme = await user.getEffectiveTheme();
    
    res.json({
      message: 'Theme selected successfully',
      token,
      activeTheme: effectiveTheme,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Theme selection error:', error);
    res.status(500).json({
      error: 'Theme selection failed',
      message: error.message
    });
  }
});

// Reset theme to hospital default (clear personal selection)
router.delete('/profile/theme', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    
    // Clear personal theme selection
    await user.update({ selectedThemeId: null });
    
    // Reload user to get updated data
    await user.reload();
    
    // Generate new token with updated theme
    const token = await generateToken(user.id, user.role);
    
    // Get the effective theme (should now be hospital default)
    const effectiveTheme = await user.getEffectiveTheme();
    
    res.json({
      message: 'Theme reset to hospital default',
      token,
      activeTheme: effectiveTheme,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Theme reset error:', error);
    res.status(500).json({
      error: 'Theme reset failed',
      message: error.message
    });
  }
});

// Get available themes for current user's hospital
router.get('/profile/themes', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'hospitalId', 'selectedThemeId']
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    
    if (!user.hospitalId) {
      return res.status(400).json({
        error: 'No hospital assigned',
        message: 'You must be assigned to a hospital to view themes'
      });
    }
    
    const hospital = await Hospital.findByPk(user.hospitalId, {
      attributes: ['id', 'themes', 'defaultThemeId']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found',
        message: 'Your assigned hospital does not exist'
      });
    }
    
    res.json({
      themes: hospital.themes || [],
      defaultThemeId: hospital.defaultThemeId,
      defaultTheme: hospital.getDefaultTheme(),
      selectedThemeId: user.selectedThemeId
    });
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({
      error: 'Failed to fetch themes',
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

    const token = await generateToken(user.id, user.role);
    
    // Get user's active theme
    const activeTheme = await user.getEffectiveTheme();

    res.json({
      message: 'Token refreshed successfully',
      token,
      activeTheme
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
