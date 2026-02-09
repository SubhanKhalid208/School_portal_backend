import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, 
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  },
  tls: {
    rejectUnauthorized: false 
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email Transporter Error:", error);
  } else {
    console.log("✅ Lahore Portal: Email server is ready to send messages!");
  }
});