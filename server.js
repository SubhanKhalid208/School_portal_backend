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
import { transporter } from './config/mail.js'; 

const app = express();

// ✅ 1. PROXY TRUST (Railway/Render/HTTPS Fix)
app.set('trust proxy', 1);

// ✅ 2. SECURITY (Modified for Cross-Origin)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
})); 

// ✅ 3. CORS CONFIGURATION (Strict Fix for Vercel + RTK Query)
const allowedOrigins = [
  'http://localhost:3000', 
  'https://school-portal-frontend-sigma.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// ✅ Manual OPTIONS handler (Preflight request fix)
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 4. SESSION (Cookie Fix for Chrome/Vercel)
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  proxy: true, 
  cookie: { 
    secure: true, // Required for HTTPS (Vercel)
    sameSite: 'none', // Required for Cross-domain cookies
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => { done(null, user); });
passport.deserializeUser((user, done) => { done(null, user); });

// 🕵️ DEBUG LOGGING
app.use((req, res, next) => {
  console.log(`📡 Incoming: ${req.method} ${req.url}`);
  next();
});

// ✅ 5. ROUTES MOUNTING
app.use(['/api/auth', '/auth'], authRoutes); 
app.use(['/api/admin', '/admin'], adminRoutes); 
app.use(['/api/courses', '/courses'], courseRoutes); 
app.use(['/api/teacher', '/teacher'], teacherRoutes);
app.use(['/api/student', '/student'], studentRoutes); 
app.use(['/api/attendance', '/attendance'], attendanceRoutes); 
app.use(['/api/quiz', '/quiz'], quizRoutes); 
app.use(['/api/debug', '/debug'], debugRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('🚀 Lahore Education API is Online and Running!');
});

// ✅ 6. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Backend par ye rasta (route) nahi mila!",
    requestedUrl: req.originalUrl 
  });
});

// ✅ 7. GLOBAL ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.message);
  res.status(500).json({ 
    success: false, 
    message: "Server mein koi bari ghalti hui hai!", 
    error: process.env.NODE_ENV === "production" ? null : err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Lahore Portal Server is live on port ${PORT}`);
  try {
    // Only verify mail if transporter is ready
    if (transporter && transporter.verify) {
        await transporter.verify();
        console.log('✅ Mail system connected.');
    }
  } catch (err) {
    console.warn('⚠️ Mail system warning:', err.message);
  }
});