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
import debugRoutes from './routes/debugRoutes.js';
import { transporter } from './config/mail.js'; 

const app = express();

// ✅ 1. PROXY TRUST: Railway aur HTTPS ke liye lazmi hai
app.set('trust proxy', 1);

// ✅ 2. SECURITY: CSP settings ko Google Auth ke liye manage kiya
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); 

// ✅ 3. CORS: Sab domains ko handle karne ke liye
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
app.use(express.urlencoded({ extended: true }));

// ✅ 4. SESSION: Production-ready cookie settings
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_portal_secret_2026',
  resave: false,
  saveUninitialized: false, 
  proxy: true, 
  cookie: { 
    secure: true, // Railway HTTPS ke liye true hona chahiye
    sameSite: 'none', // Cross-domain (Vercel to Railway) ke liye zaroori hai
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 1 Din
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => { done(null, user); });
passport.deserializeUser((user, done) => { done(null, user); });

// 🕵️ DEBUGGING MIDDLEWARE: Ye aapko Railway logs mein batayega ke request aa rahi hai
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} request to: ${req.url}`);
  next();
});

// ✅ 5. ROUTES MOUNTING
// Ensure these paths match your frontend fetch calls
app.use('/api/auth', authRoutes); 
app.use('/api/courses', courseRoutes); 
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes); // Dashboard stats aur users yahan se handle hotay hain
app.use('/api/student', studentRoutes); 
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/debug', debugRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('🚀 Lahore Education API is Online and Running!');
});

// ✅ 6. 404 HANDLER: Agar koi route match na ho
app.use((req, res) => {
  console.warn(`⚠️ 404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: "Backend par ye rasta (route) nahi mila!" });
});

// ✅ 7. GLOBAL ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err.stack);
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
    // Mail transporter verification
    await transporter.verify();
    console.log('✅ Mail system connected and ready.');
  } catch (err) {
    console.error('❌ Mail system connection failed:', err.message);
  }
});