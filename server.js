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

// ✅ 1. PROXY TRUST: Must be first for Railway/HTTPS
app.set('trust proxy', 1);

// ✅ 2. SECURITY: CSP disabled for Google Auth compatibility
app.use(helmet({
  contentSecurityPolicy: false,
})); 

// ✅ 3. CORS: Specific to your Vercel URL
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

// ✅ 4. SESSION: Optimized for Cross-Domain Cookies (Vercel <-> Railway)
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  proxy: true, 
  cookie: { 
    // Important for Production
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 1 Day
  }
}));

// ✅ 5. PASSPORT: Initialize after Session
app.use(passport.initialize());
app.use(passport.session());

// Serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// ✅ 6. ROUTES
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

// ✅ 7. ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("❌ SERVER CRASH ERROR:", err.message);
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