const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authMiddleware, generateTokens } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username: 3-30 chars, alphanumeric + underscore only'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name max 50 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;
    
    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }]
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }
    
    // Create user
    const user = new User({
      email,
      username: username.toLowerCase(),
      passwordHash: password,
      displayName: displayName || username,
      authProvider: 'local'
    });
    
    await user.save();
    
    // Generate tokens
    const tokens = generateTokens(user._id);
    
    // Save refresh token
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();
    
    res.status(201).json({
      success: true,
      data: {
        user: user.publicProfile,
        tokens
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', [
  body('email').notEmpty().withMessage('Email/username required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() }
      ]
    }).select('+passwordHash');
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate tokens
    const tokens = generateTokens(user._id);
    
    // Save refresh token (limit to 5)
    user.refreshTokens.push({ token: tokens.refreshToken });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();
    
    res.json({
      success: true,
      data: {
        user: user.publicProfile,
        tokens
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.refreshTokens.some(t => t.token === refreshToken)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user._id);
    
    // Replace old refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();
    
    res.json({
      success: true,
      data: { tokens }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(
        t => t.token !== refreshToken
      );
      await req.user.save();
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;
