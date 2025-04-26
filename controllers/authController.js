const crypto = require('crypto');
const User = require('../models/User');
const jwtService = require('../utils/jwtService');
const emailService = require('../utils/emailService');
const jwt = require('jsonwebtoken');

/**
 * Authentication controller
 */
const authController = {
    /**
     * Register a new user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async register(req, res) {
        try {
            const { username, email, password } = req.body;

            // Check if username or email is already taken
            const existingUser = await User.findOne({
                $or: [{ email }, { username }]
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Email is already registered'
                    });
                }

                if (existingUser.username === username) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Username is already taken'
                    });
                }
            }

            // Create new user
            const user = new User({
                username,
                email,
                password
            });

            // Generate verification token
            const verificationToken = user.generateVerificationToken();

            // Save user
            await user.save();

            // Only attempt to send email in production or if email config is valid
            let emailSent = false;
            if (process.env.NODE_ENV === 'production' || process.env.EMAIL_PASS !== 'your-app-password') {
                try {
                    await emailService.sendVerificationEmail(
                        user.email,
                        user.username,
                        verificationToken
                    );
                    emailSent = true;
                } catch (emailError) {
                    console.error('Failed to send verification email:', emailError);
                    // Continue with registration anyway
                }
            } else {
                console.log('Skipping email verification in development mode or email not configured');
                // Auto-verify user in development environment
                if (process.env.NODE_ENV === 'development') {
                    user.isVerified = true;
                    await user.save();
                }
            }

            // Return success response
            return res.status(201).json({
                status: 'success',
                message: emailSent
                    ? 'Registration successful. Please check your email to verify your account.'
                    : 'Registration successful. Email verification skipped in development mode.',
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        isVerified: user.isVerified,
                        createdAt: user.createdAt
                    }
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Registration failed. Please try again later.'
            });
        }
    },

    /**
     * Verify email
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async verifyEmail(req, res) {
        try {
            const { token } = req.params;

            // Hash the token from the URL
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Find user with matching token and valid expiry
            const user = await User.findOne({
                verificationToken: hashedToken,
                verificationTokenExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid or expired verification token'
                });
            }

            // Update user
            user.isVerified = true;
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;

            await user.save();

            return res.status(200).json({
                status: 'success',
                message: 'Email verified successfully. You can now log in.'
            });
        } catch (error) {
            console.error('Email verification error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Email verification failed. Please try again later.'
            });
        }
    },

    /**
     * Login user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user by email (and include password field)
            const user = await User.findOne({ email }).select('+password');

            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Check if email is verified (skip in development mode if configured)
            if (!user.isVerified && process.env.NODE_ENV !== 'development') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Please verify your email before logging in'
                });
            }

            // Check password - Using matchPassword instead of comparePassword
            const isPasswordValid = await user.matchPassword(password);

            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Update last login
            user.lastLogin = Date.now();
            await user.save({ validateBeforeSave: false });

            // Generate JWT token
            const token = jwtService.generateToken({
                id: user._id,
                username: user.username,
                email: user.email
            });

            // Send response
            return res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        isVerified: user.isVerified,
                        avatarUrl: user.avatarUrl,
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Login failed. Please try again later.'
            });
        }
    },

    /**
     * Request password reset
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            // Find user by email
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'No account found with this email address'
                });
            }

            // Generate reset token
            const resetToken = user.generatePasswordResetToken();
            await user.save({ validateBeforeSave: false });

            // Send password reset email
            await emailService.sendPasswordResetEmail(
                user.email,
                user.username,
                resetToken
            );

            return res.status(200).json({
                status: 'success',
                message: 'Password reset instructions sent to your email'
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to process password reset request. Please try again later.'
            });
        }
    },

    /**
     * Reset password with token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async resetPassword(req, res) {
        try {
            const { token } = req.params;
            const { password } = req.body;

            // Hash the token from the URL
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Find user with matching token and valid expiry
            const user = await User.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid or expired password reset token'
                });
            }

            // Update password and clear reset token fields
            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            await user.save();

            return res.status(200).json({
                status: 'success',
                message: 'Password reset successful. You can now log in with your new password.'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Password reset failed. Please try again later.'
            });
        }
    },

    /**
     * Get current user profile
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            return res.status(200).json({
                status: 'success',
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        isVerified: user.isVerified,
                        avatarUrl: user.avatarUrl,
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin
                    }
                }
            });
        } catch (error) {
            console.error('Get profile error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve user profile. Please try again later.'
            });
        }
    },

    /**
     * Logout user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async logout(req, res) {
        try {
            // For cookie-based auth, clear the cookie
            res.clearCookie('access_token');

            return res.status(200).json({
                status: 'success',
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Logout failed. Please try again later.'
            });
        }
    },

    /**
     * Refresh access token using refresh token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Object} - Response object
     */
    async refreshToken(req, res) {
        try {
            // Get refresh token from cookie or request body
            const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Refresh token is required'
                });
            }

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

            // Find user
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // Generate new access token
            const accessToken = jwtService.generateToken({
                id: user._id,
                username: user.username,
                email: user.email
            });

            return res.status(200).json({
                status: 'success',
                message: 'Token refreshed successfully',
                data: {
                    token: accessToken
                }
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired refresh token'
            });
        }
    }
};

module.exports = authController; 