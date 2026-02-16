import express from 'express';
import { sendWelcomeEmail } from '../controllers/authController.js';
import { transporter } from '../config/mail.js';
import pool from '../config/db.js';

const router = express.Router();

/**
 * CHECK EMAIL CONFIGURATION
 * Use: /api/debug/check-email-config
 */
router.get('/check-email-config', async (req, res) => {
  try {
    console.log('🔍 Checking Email Configuration...');
    
    const config = {
      EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET',
      EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET',
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 465,
      EMAIL_ACCOUNT: process.env.EMAIL_USER || 'NOT CONFIGURED'
    };

    console.log('Configuration:', config);

    // Try to verify transporter
    const verified = await new Promise((resolve) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Transporter verification failed:', error);
          resolve({ connected: false, error: error.message });
        } else {
          console.log('✅ Transporter verification successful');
          resolve({ connected: true, message: 'Email service is ready' });
        }
      });
    });

    res.json({
      success: true,
      config: config,
      transporter_status: verified,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error checking configuration:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * TEST EMAIL ROUTE
 * Use: /api/debug/send-test-email?email=user@example.com&key=ADMIN_SECRET
 */
router.get('/send-test-email', async (req, res) => {
  const { email, key } = req.query;
  
  // 1. Basic Validation
  if (!email) {
    return res.status(400).json({ error: 'Provide email as ?email=you@domain.com' });
  }

  // 2. Security Check (Optional but Recommended)
  // Taake har koi is route ko hit na kar sakay
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "lahore_portal_786";
  if (key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Security Key' });
  }

  try {
    console.log(`📧 Attempting to send test email to: ${email}`);
    
    // 3. Controller Call
    const result = await sendWelcomeEmail(email, 1);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully via Lahore Portal!', 
      info: result 
    });

  } catch (err) {
    console.error('❌ Debug Email Failed:', err.message);
    
    res.status(500).json({ 
      success: false, 
      error: 'Email sending failed',
      details: err.message,
      code: err.code,
      command: err.command,
      // Railway/Production environment check
      env: process.env.NODE_ENV 
    });
  }
});

export default router;

// Helper debug route: Detect assignment column used in quiz_results
router.get('/quiz-assignment-col', async (req, res) => {
  try {
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "lahore_portal_786";
    if (req.query.key && req.query.key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='quiz_results' AND column_name IN ('assignment_id','quiz_assignment_id','assignmentid','quiz_id') LIMIT 1");
    const col = result.rows[0]?.column_name || null;
    res.json({ success: true, column: col });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});