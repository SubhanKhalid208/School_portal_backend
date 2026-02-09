import express from 'express';
import { sendWelcomeEmail } from '../controllers/authController.js';

const router = express.Router();

/**
 * TEST EMAIL ROUTE
 * Use: /api/email/send-test-email?email=user@example.com&key=ADMIN_SECRET
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
      // Railway/Production environment check
      env: process.env.NODE_ENV 
    });
  }
});

export default router;