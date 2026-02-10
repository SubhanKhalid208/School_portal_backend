import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail', // Host ki jagah direct service use karein
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Extra security settings
  pool: true,
  maxConnections: 1,
  rateLimit: 1
});

// Verification ko non-blocking banaya hai taake server crash na ho
transporter.verify((error) => {
  if (error) {
    console.log("⚠️ Email System Warning: Connection delayed or blocked.");
    // Hum yahan process.exit() nahi kar rahe taake server chalta rahe
  } else {
    console.log("✅ Lahore Portal: Email system is ready!");
  }
});