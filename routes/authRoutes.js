import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js'; 

// Environment variables handle karne ke liye
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // ✅ FIXED: Hardcoded localhost removed
    callbackURL: CALLBACK_URL 
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        const { displayName, emails, photos } = profile;
        const email = emails[0].value;
        const profile_pic = photos[0]?.value || null;

        let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            const newUser = await pool.query(
                "INSERT INTO users (name, email, profile_pic, role, is_approved) VALUES ($1, $2, $3, 'student', true) RETURNING *",
                [displayName, email, profile_pic]
            );
            return done(null, newUser.rows[0]);
        }
        return done(null, user.rows[0]);
    } catch (err) {
      console.error("Google Auth Error:", err);
      return done(err, null);
    }
  }
));

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/reset-password', authController.resetPassword);
router.get('/users', verifyToken, authController.getUsers); 

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { 
    // ✅ FIXED: Fail hone par Vercel link par bheje ga
    failureRedirect: `${CLIENT_URL}/login`, 
    session: true 
  }),
  (req, res) => {
    const user = req.user;

    // Cookies set karein
    res.cookie('role', user.role, { path: '/' });
    res.cookie('userId', user.id, { path: '/' });

    console.log(`Redirecting User: ${user.email} with Role: ${user.role}`);

    // ✅ FIXED: Redirect logic now uses dynamic CLIENT_URL (Vercel)
    if (user.role === 'admin') {
        return res.redirect(`${CLIENT_URL}/admin`);
    } else if (user.role === 'teacher') {
        return res.redirect(`${CLIENT_URL}/teacher`);
    } else {
        return res.redirect(`${CLIENT_URL}/dashboard/student/${user.id}`);
    }
  }
);

export default router;