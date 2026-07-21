// utils/Email.js
const nodemailer = require('nodemailer');

const Email = async (options) => {
    try {
        // Create transporter with better configuration
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_MAIL || 'srvnkmrmarimuthu@gmail.com',
                pass: process.env.SMTP_PASSWORD || 'nqdm ktju anvb zoqf',
            },
            // Add these for better reliability
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
        });

        // Email content
        const mailOptions = {
            from: `"Sri Chakra Dental" <${process.env.SMTP_MAIL || 'srvnkmrmarimuthu@gmail.com'}>`,
            to: options.email,
            subject: options.subject,
            html: options.html,
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        return info;
        
    } catch (error) {
        console.error('SendEmail Error:', error.message);
        console.error('Error stack:', error.stack);
        throw new Error(`Email sending failed: ${error.message}`);
    }
};

module.exports = Email;