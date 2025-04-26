const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get current user (protected route)
router.get('/me', protect, authController.getProfile);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password/:token', authController.resetPassword);

// Logout user
router.post('/logout', authController.logout);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

module.exports = router; 