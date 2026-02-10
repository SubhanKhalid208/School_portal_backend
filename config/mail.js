import nodemailer from 'nodemailer';

// Environment variables check for Lahore Portal
console.log('📧 Email Config Check:');
console.log('  - EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
console.log('  - EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  },
  // Timeout settings taake Lahore ke slow internet pe crash na ho
  connectionTimeout: 10000, 
  greetingTimeout: 10000
});

// Verification check
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Transporter Error:", error.message);
  } else {
    console.log("✅ Lahore Portal: Email server is ready to send messages!");
  }
});

// Named export (Isi ki waja se error aa raha tha)
export { transporter };

// Default export (Safeguard)
export default transporter;