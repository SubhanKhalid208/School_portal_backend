import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
import passport from 'passport'; 
import session from 'express-session'; 
import helmet from 'helmet'; 

// Routes (Confirm karein ke ye saari files routes folder mein hain)
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import quizRoutes from './routes/quizRoutes.js'; 
import debugRoutes from './routes/debugRoutes.js';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000', 
  'https://school-portal-frontend-sigma.vercel.app'
];

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

// Session Fix for Railway
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

// Routes setup
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes); 
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/debug', debugRoutes);

app.get('/', (req, res) => res.send('🚀 Backend is Running!'));

// CRITICAL: Ye crash hone se bachaye ga
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server on port ${PORT}`);
});