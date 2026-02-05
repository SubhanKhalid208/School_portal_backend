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

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); 

// ✅ FIXED CORS: Adding Vercel and Localhost for both environments
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

// ✅ FIXED SESSION: Secure cookies for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  cookie: { 
    secure: process.env.NODE_ENV === "production", // Production mein true hona chahiye
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

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

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(500).json({ success: false, message: "Server mein koi masla hai!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    await transporter.verify();
    console.log('✅ Mail transporter is ready to send emails.');
  } catch (err) {
    console.error('❌ Mail transporter verification failed on startup:', err.message);
  }
});