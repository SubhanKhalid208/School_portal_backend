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

// ✅ 1. PROXY TRUST (Railway Fix)
app.set('trust proxy', 1);

// ✅ 2. MANUAL CORS (Har request ke liye headers set karein)
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000', 
    'https://school-portal-frontend-sigma.vercel.app'
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Development fallback
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // ✅ Pre-flight OPTIONS request fix
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ✅ 3. SECURITY & PARSING
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
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

// ✅ 5. ROUTES (No wildcards to prevent PathError)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/debug', debugRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('🚀 Lahore Education API is Online and Running!');
});

// ✅ 6. GLOBAL ERROR HANDLING (Preventing Crashes)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Internal Server Error",
    error: err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Lahore Portal Server is live on port ${PORT}`);
});