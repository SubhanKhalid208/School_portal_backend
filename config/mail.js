import nodemailer from 'nodemailer';

// Environment variables check for Lahore Portal
console.log('📧 Email Config Check:');
console.log('  - EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
console.log('  - EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET');

// ✅ Create transporter, but don't crash if email is not configured
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
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

  // Verification check - only if transporter exists
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ Email Transporter Error:", error.message);
    } else {
      console.log("✅ Lahore Portal: Email server is ready to send messages!");
    }
  });
} else {
  console.warn("⚠️ Email config not set on Railway - Email features will be disabled");
  // Dummy transporter that logs but doesn't crash
  transporter = {
    sendMail: (options, callback) => {
      console.log("📧 Email not configured. Simulating send:", options.to);
      if (callback) callback(null, { response: "Email feature disabled" });
    }
  };
}

export { transporter };

// Default export (Safeguard)
export default transporter;