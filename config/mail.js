import nodemailer from 'nodemailer';

// Simple initialization without any blocking calls or heavy logs
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Just a simple startup confirmation
console.log('🚀 Lahore Portal: Email service initialized.');