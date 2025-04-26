const nodemailer = require('nodemailer');
const sendEmail = require('./sendEmail');

/**
 * Email service for sending verification and password reset emails
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Get the appropriate frontend URL based on environment
   * @returns {string} The frontend URL to use for links
   */
  getFrontendUrl() {
    // Use production URL in production environment if available
    if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_PROD_URL) {
      return process.env.FRONTEND_PROD_URL;
    }
    // Otherwise use development URL or default
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Send verification email
   * @param {string} to - Recipient email address
   * @param {string} username - Recipient username
   * @param {string} token - Verification token
   * @returns {Promise<void>}
   */
  async sendVerificationEmail(to, username, token) {
    try {
      // Skip email in development if not configured
      if (process.env.NODE_ENV === 'development' && process.env.EMAIL_PASS === 'your-app-password') {
        console.log(`[DEV MODE] Would send verification email to ${to} with token ${token}`);
        return;
      }

      const subject = 'Verify your Dice Raja account';
      const frontendUrl = this.getFrontendUrl();
      const verificationUrl = `${frontendUrl}/verify-email/${token}`;

      const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #6200ea; text-align: center;">Welcome to Dice Raja!</h2>
                    <p>Hello ${username},</p>
                    <p>Thank you for registering with Dice Raja. Please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
                    </div>
                    <p>If the button doesn't work, you can also use this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't register for a Dice Raja account, please ignore this email.</p>
                    <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} Dice Raja. All rights reserved.</p>
                    </div>
                </div>
            `;

      const text = `Welcome to Dice Raja!\n\nHello ${username},\n\nThank you for registering with Dice Raja. Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't register for a Dice Raja account, please ignore this email.\n\n© ${new Date().getFullYear()} Dice Raja. All rights reserved.`;

      await sendEmail({
        to,
        subject,
        text,
        html
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email address
   * @param {string} username - Recipient username
   * @param {string} token - Password reset token
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(to, username, token) {
    try {
      // Skip email in development if not configured
      if (process.env.NODE_ENV === 'development' && process.env.EMAIL_PASS === 'your-app-password') {
        console.log(`[DEV MODE] Would send password reset email to ${to} with token ${token}`);
        return;
      }

      const subject = 'Reset your Dice Raja password';
      const frontendUrl = this.getFrontendUrl();
      const resetUrl = `${frontendUrl}/reset-password/${token}`;

      const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #6200ea; text-align: center;">Reset Your Password</h2>
                    <p>Hello ${username},</p>
                    <p>You've requested a password reset for your Dice Raja account. Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>If the button doesn't work, you can also use this link: <a href="${resetUrl}">${resetUrl}</a></p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                        <p>&copy; ${new Date().getFullYear()} Dice Raja. All rights reserved.</p>
                    </div>
                </div>
            `;

      const text = `Reset Your Password\n\nHello ${username},\n\nYou've requested a password reset for your Dice Raja account. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email. Your password will remain unchanged.\n\n© ${new Date().getFullYear()} Dice Raja. All rights reserved.`;

      await sendEmail({
        to,
        subject,
        text,
        html
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 