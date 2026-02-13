import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
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

// ✅ 1. PROXY TRUST (Railway deployment ke liye zaroori hai)
app.set('trust proxy', 1);

// ✅ 2. DYNAMIC CORS SETUP (Local + Production Fix)
// CLIENT_URL ko environment variable se utha kar array mein convert kiya
const envOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
const allowedOrigins = [
  'http://localhost:3000', 
  'https://school-portal-frontend-sigma.vercel.app',
  ...envOrigins
];

app.use(cors({
  origin: function (origin, callback) {
    // Postman ya direct server calls ke liye
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a vercel subdomain
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// ✅ 3. SECURITY & PARSING
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
})); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 4. SESSION (Environment Aware Cookies)
// Localhost par 'secure: true' kaam nahi karta agar HTTPS na ho
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  proxy: true, 
  cookie: { 
    secure: isProduction, // Production (Railway) par true, Local par false
    sameSite: isProduction ? 'none' : 'lax', // Local host login fix
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ 5. ROUTES
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
  res.send('🚀 Lahore Portal API is Fixed and Online!');
});

// ✅ 6. ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("❌ CRITICAL ERROR:", err.message);
  res.status(500).json({ 
    success: false, 
    message: "Server Error",
    error: !isProduction ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});