import nodemailer from 'nodemailer';

console.log('📧 Email Config Check:');
console.log('  - EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
console.log('  - EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET');

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Transporter Error:", error.message);
    console.error("   Full Error:", error);
  } else {
    console.log("✅ Lahore Portal: Email server is ready to send messages!");
  }
});