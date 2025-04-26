const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to validate request data
 */
const validation = {
    /**
     * Registration validation rules
     */
    registerRules: [
        body('username')
            .notEmpty().withMessage('Username is required')
            .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
            .isLength({ max: 20 }).withMessage('Username cannot exceed 20 characters')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email address'),

        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    ],

    /**
     * Login validation rules
     */
    loginRules: [
        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email address'),

        body('password')
            .notEmpty().withMessage('Password is required')
    ],

    /**
     * Forgot password validation rules
     */
    forgotPasswordRules: [
        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email address')
    ],

    /**
     * Reset password validation rules
     */
    resetPasswordRules: [
        param('token')
            .notEmpty().withMessage('Token is required'),

        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

        body('confirmPassword')
            .notEmpty().withMessage('Confirm password is required')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            })
    ],

    /**
     * Verify email validation rules
     */
    verifyEmailRules: [
        param('token')
            .notEmpty().withMessage('Verification token is required')
    ],

    /**
     * Validate request data
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     * @returns {Function|Object} - Next function or error response
     */
    validate: (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.path,
                    message: error.msg
                }))
            });
        }

        next();
    }
};

module.exports = validation; 