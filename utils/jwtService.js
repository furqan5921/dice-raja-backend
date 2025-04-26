const jwt = require('jsonwebtoken');

/**
 * Service for handling JWT tokens
 */
class JwtService {
    /**
     * Generate JWT token for user authentication
     * @param {Object} payload - Token payload (user data)
     * @returns {string} - JWT token
     */
    generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY
        });
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object|null} - Decoded token payload or null if invalid
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    /**
     * Extract token from authorization header
     * @param {string} authHeader - Authorization header
     * @returns {string|null} - Token or null if no valid token found
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        return authHeader.split(' ')[1];
    }
}

module.exports = new JwtService(); 