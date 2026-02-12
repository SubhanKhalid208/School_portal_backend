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

// ✅ 1. PROXY TRUST
app.set('trust proxy', 1);

// ✅ 2. MANUAL CORS (Zero Library - Har request par headers lazmi jayenge)
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ✅ 3. SECURITY
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

// ✅ 5. ROUTES (Fixing the PathError)
// Har route ko alag alag mount karein, array use na karein
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/debug', debugRoutes);

app.get('/', (req, res) => {
  res.send('🚀 Lahore Portal API is Online and Fixed!');
});

// ✅ 6. SAFE ERROR HANDLING (No more SIGTERM)
app.use((err, req, res, next) => {
  console.error("❌ CRITICAL ERROR:", err.message);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});