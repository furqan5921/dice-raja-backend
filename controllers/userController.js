const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (userExists) {
        res.status(400);
        throw new Error(
            userExists.email === email
                ? 'Email already registered'
                : 'Username already taken'
        );
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();

    // Save the user with verification token
    await user.save();

    // Create verification URL
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify-email/${verificationToken}`;

    // Create email message
    const message = `
    <h1>Email Verification</h1>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verificationUrl}" clicktracking="off">Verify Email</a>
  `;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Email Verification',
            html: message
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for verification.'
        });
    } catch (error) {
        user.verificationToken = undefined;
        await user.save();

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Verify email
// @route   GET /api/users/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
    // Get hashed token
    const verificationToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        verificationToken
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired token');
    }

    // Set user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Email verified successfully'
    });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Check if user is verified
    if (!user.isVerified) {
        res.status(401);
        throw new Error('Please verify your email before logging in');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Set JWT cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            role: user.role
        }
    });
});

// @desc    Logout user / clear cookies
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            role: user.role,
            createdAt: user.createdAt
        }
    });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Update fields
    user.username = req.body.username || user.username;
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;

    // If email is being changed, require re-verification
    if (req.body.email && req.body.email !== user.email) {
        // Check if email already exists
        const emailExists = await User.findOne({ email: req.body.email });

        if (emailExists) {
            res.status(400);
            throw new Error('Email already in use');
        }

        user.email = req.body.email;
        user.isVerified = false;

        // Generate new verification token
        const verificationToken = user.generateVerificationToken();

        // Create verification URL
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify-email/${verificationToken}`;

        // Create email message
        const message = `
      <h1>Email Verification</h1>
      <p>Please verify your new email by clicking the link below:</p>
      <a href="${verificationUrl}" clicktracking="off">Verify Email</a>
    `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your New Email',
                html: message
            });
        } catch (error) {
            user.verificationToken = undefined;
            res.status(500);
            throw new Error('Email could not be sent');
        }
    }

    // Update password if provided
    if (req.body.password) {
        user.password = req.body.password;
    }

    // Save updated user
    const updatedUser = await user.save();

    res.status(200).json({
        success: true,
        user: {
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            profilePicture: updatedUser.profilePicture,
            role: updatedUser.role,
            isVerified: updatedUser.isVerified
        }
    });
});

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Generate and hash password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;

    // Create message
    const message = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Please click the link below to reset your password:</p>
    <a href="${resetUrl}" clicktracking="off">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
  `;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Password Reset Request',
            html: message
        });

        res.status(200).json({
            success: true,
            message: 'Password reset email sent'
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Reset password
// @route   PUT /api/users/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password reset successful'
    });
});

// @desc    Refresh access token
// @route   POST /api/users/refresh-token
// @access  Public (with refresh token)
const refreshToken = asyncHandler(async (req, res) => {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        res.status(401);
        throw new Error('No refresh token provided');
    }

    try {
        // Verify token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Get user
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        // Generate new access token
        const newToken = user.generateAuthToken();

        // Set JWT cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        res.status(401);
        throw new Error('Invalid or expired refresh token');
    }
});

module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    refreshToken
}; 