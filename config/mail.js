import nodemailer from 'nodemailer';

console.log('📧 Email Config Check:');
console.log('  - EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
console.log('  - EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET');

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,               // Railway ke liye 465 ki jagah 587 behtar hai
  secure: false,           // Port 587 ke liye isay false rakhna zaroori hai
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  },
  tls: {
    // Ye line connection timeout aur certificate errors ko khatam karegi
    rejectUnauthorized: false 
  }
});

// Transporter verification logic
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Transporter Error:", error.message);
    console.error("   Full Error Details:", error);
  } else {
    console.log("✅ Lahore Portal: Email server is ready to send messages!");
  }
});