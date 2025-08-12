const nodemailer = require('nodemailer');

// Add these console.log statements for debugging
console.log('EMAIL_USER from .env:', process.env.EMAIL_USER);
console.log('EMAIL_PASS from .env:', process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send email
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html
    };
    
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw new Error(`Error sending email: ${error.message}`);
  }
};

module.exports = {
  transporter,
  sendEmail
};

