import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
import passport from 'passport'; 
import session from 'express-session'; 
import helmet from 'helmet'; 
import path from 'path'; 
import fs from 'fs'; 
import { fileURLToPath } from 'url'; 

// Route Imports
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import quizRoutes from './routes/quizRoutes.js'; 
import debugRoutes from './routes/debugRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Check and create uploads folder (Profile pictures ke liye)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000', 
  'https://school-portal-frontend-sigma.vercel.app'
];

// ✅ CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(helmet({ contentSecurityPolicy: false })); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Profile pictures static link (Frontend isi folder se image uthayega)
app.use('/uploads', express.static(uploadDir));

// ✅ Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'lahore_secret_2026',
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

// --- 🚀 Routes setup ---

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);

/**
 * ✅ MUHAMMAD AHMED: 
 * Aapke frontend se request '/api/teachers' ya '/api/teaches' par ja rahi thi.
 * Maine isay '/api/teachers' kar diya hai. 
 * Agar aapka frontend '/api/teacher' (baghair 's') use karta hai, to yahan se 's' mita dena.
 */
app.use('/api/teachers', teacherRoutes); 

app.use('/api/student', studentRoutes); 
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/debug', debugRoutes);

app.get('/', (req, res) => res.send('🚀 Lahore Portal Backend is Running!'));

// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});