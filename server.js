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

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());


app.use(session({
  
  secret: process.env.SESSION_SECRET || 'fallback_secret_dont_use_in_prod',
  resave: false,
  saveUninitialized: false, 
  cookie: { 
    secure: false, 
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  try {
    await transporter.verify();
    console.log('✅ Mail transporter is ready to send emails.');
  } catch (err) {
    console.error('❌ Mail transporter verification failed on startup:', err.message);
  }
});