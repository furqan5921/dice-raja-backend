const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {
    // Middleware to authenticate user
    authenticate: async (req, res, next) => {
        try {
            // Get token from cookie or authorization header
            const token = req.cookies.access_token ||
                (req.headers.authorization && req.headers.authorization.startsWith('Bearer')
                    ? req.headers.authorization.split(' ')[1]
                    : null);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please log in.'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user exists
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found or unauthorized.'
                });
            }

            // Check if user is verified
            if (!user.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: 'Please verify your email to access this resource.'
                });
            }

            // Add user to request object
            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication token expired. Please log in again.'
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token. Please log in again.'
            });
        }
    },

    // Middleware to check if user is admin
    isAdmin: (req, res, next) => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        next();
    },

    authenticateToken: async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Unauthorized: No token provided' });
            }

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user
            const user = await User.findById(decoded.userId);

            if (!user) {
                return res.status(401).json({ message: 'Unauthorized: Invalid user' });
            }

            // Set user info to req object
            req.user = {
                userId: user._id,
                username: user.username,
                email: user.email
            };

            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Unauthorized: Invalid token' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Unauthorized: Token expired' });
            }

            console.error('Authentication error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = authMiddleware; 