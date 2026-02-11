import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js'; 

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "https://schoolportalbackend-production-e803.up.railway.app/api/auth/google/callback";

// Strategy Configuration
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("❌ ERROR: Google Credentials Missing!");
} else {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL 
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
            const { displayName, emails, photos } = profile;
            const email = emails[0].value;
            const profile_pic = photos[0]?.value || null;

            let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

            if (user.rows.length === 0) {
                // Default new users to 'student' and auto-approve for Google
                const newUser = await pool.query(
                    "INSERT INTO users (name, email, profile_pic, role, is_approved, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                    [displayName, email, profile_pic, 'student', true, 'google_authenticated']
                );
                return done(null, newUser.rows[0]);
            }
            return done(null, user.rows[0]);
        } catch (err) {
          console.error("❌ Google Auth Strategy Error:", err);
          return done(err, null);
        }
      }
    ));
}

// ✅ Standard Auth Routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/reset-password', authController.resetPassword);
router.get('/users', verifyToken, authController.getUsers); 

// ✅ Google OAuth Routes
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' 
}));

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        if (err || !user) {
            console.error("❌ Auth Failed:", err || "No user found");
            return res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
        }
        
        req.logIn(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            
            const isProd = process.env.NODE_ENV === 'production';
            const cookieOptions = { 
                path: '/', 
                secure: isProd, 
                sameSite: isProd ? 'none' : 'lax', 
                maxAge: 24 * 60 * 60 * 1000 
            };

            // Essential cookies for frontend
            res.cookie('role', user.role, cookieOptions);
            res.cookie('userId', user.id.toString(), cookieOptions);
            res.cookie('userName', user.name, cookieOptions);

            // ✅ ROUTE FIX: Lahore Portal dashboard paths optimized
            let redirectPath = '/dashboard';
            
            if (user.role === 'admin') {
                redirectPath = '/admin';
            } else if (user.role === 'teacher') {
                redirectPath = '/teacher';
            } else if (user.role === 'student') {
                // ✅ Dynamic Student Path: dashboard/student/[id]
                redirectPath = `/dashboard/student/${user.id}`; 
            }
            
            console.log(`✅ Google Login Success: Redirecting to ${redirectPath}`);
            return res.redirect(`${CLIENT_URL}${redirectPath}`);
        });
    })(req, res, next);
});

export default router;