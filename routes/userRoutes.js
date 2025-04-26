const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Mock user profile route
router.get('/profile', protect, (req, res) => {
    res.json({
        status: 'success',
        data: {
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                isVerified: req.user.isVerified
            }
        }
    });
});

// Health check route
router.get('/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'User routes are working'
    });
});

module.exports = router; 