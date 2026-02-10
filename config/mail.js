import nodemailer from 'nodemailer';

// Direct export without blocking verification
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Connection stability settings
  pool: true,
  maxConnections: 1,
  rateLimit: 1
});

// Non-blocking log for debugging
console.log('📧 Email System: Transporter initialized for Lahore Portal.');