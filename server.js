import 'dotenv/config';
import express from 'express';
import passport from 'passport'; 
import session from 'express-session'; 
import helmet from 'helmet'; 

// Routes Imports
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import quizRoutes from './routes/quizRoutes.js'; 
import debugRoutes from './routes/debugRoutes.js';

const app = express();

// ✅ 1. PROXY TRUST (Railway ke liye lazmi)
app.set('trust proxy', 1);

// ✅ 2. FIX: Manual CORS & Pre-flight (Isay har haal mein response dena chahiye)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000', 
    'https://school-portal-frontend-sigma.vercel.app'
  ];

  if (allowedOrigins.includes(origin) || (origin && origin.includes('vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Origin');

  // Pre-flight handshake ko foran ok karein
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ✅ 3. SECURITY & PARSING
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
})); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 4. SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  proxy: true, 
  cookie: { 
    secure: true, 
    sameSite: 'none', 
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => { done(null, user); });
passport.deserializeUser((user, done) => { done(null, user); });

// ✅ 5. ROUTES FIX (Sirf single string paths use karein taake crash na ho)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/debug', debugRoutes);

// Main Route
app.get('/', (req, res) => {
  res.send('🚀 Lahore Education API is Online!');
});

// ✅ 6. ERROR HANDLER (Taake server SIGTERM na kare)
app.use((err, req, res, next) => {
  console.error("❌ ERROR DETECTED:", err.message);
  res.status(500).json({ success: false, message: "Server error occurred" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Lahore Portal Server is live on port ${PORT}`);
});