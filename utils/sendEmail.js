const nodemailer = require('nodemailer');

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text version of the email
 * @param {string} options.html - HTML version of the email
 * @returns {Promise} - Resolves with the result of sending the email
 */
const sendEmail = async (options) => {
    // Create transporter
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
        }
    });

    // Define email options
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'Dice Raja <your-email@gmail.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return info;
};

module.exports = sendEmail; 