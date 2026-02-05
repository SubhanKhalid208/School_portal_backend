import express from 'express';
import { sendWelcomeEmail } from '../controllers/authController.js';

const router = express.Router();


router.get('/send-test-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Provide email as ?email=you@domain.com' });

  try {
    
    const result = await sendWelcomeEmail(email, 1);
    res.json({ success: true, message: 'Test email sent', info: result });
  } catch (err) {
    console.error('Debug send-test-email failed:', err.message, err.response || '');
    res.status(500).json({ success: false, error: err.message, response: err.response || null });
  }
});

export default router;
