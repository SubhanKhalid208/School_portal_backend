import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport'; 
import session from 'express-session'; 
import helmet from 'helmet'; 

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import { transporter } from './config/mail.js'; 

const app = express();

// ✅ CRITICAL FOR RAILWAY: Trust proxy is required for secure cookies
app.set('trust proxy', 1);

// --- SECURITY MIDDLEWARE ---
app.use(helmet({
  contentSecurityPolicy: false, // Google Auth ke liye CSP disable ya configure karna parta hai
})); 

// ✅ FIXED CORS: Credentials allowed for session/cookies
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://school-portal-frontend-sigma.vercel.app'
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ✅ FIXED SESSION: Secure and optimized for Production
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  proxy: true, // Railway proxy support
  cookie: { 
    secure: process.env.NODE_ENV === "production", // Production (HTTPS) mein true
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Cross-site support for Vercel -> Railway
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ Note: Serialization yahan bhi hai aur authRoutes mein bhi ho sakti hai.
// Behtar hai aik hi jagah rahe. Agar authRoutes mein likh di hai toh yahan se hata dein.
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use('/api/auth', authRoutes); 
app.use('/api/courses', courseRoutes); 
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/student', studentRoutes);
app.use('/api/debug', debugRoutes);

app.get('/', (req, res) => {
  res.send('Lahore Education API is Online and Running!');
});

// ✅ Better Error Logging: Console mein asli error dikhaye ga
app.use((err, req, res, next) => {
  console.error("❌ SERVER CRASH ERROR:", err.message);
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Server mein koi masla hai!", 
    error: process.env.NODE_ENV === "production" ? null : err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    await transporter.verify();
    console.log('✅ Mail transporter is ready.');
  } catch (err) {
    console.error('❌ Mail verify failed:', err.message);
  }
});