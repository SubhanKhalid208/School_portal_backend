import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
import passport from 'passport'; 
import session from 'express-session'; 
import helmet from 'helmet'; 
import path from 'path'; 
import fs from 'fs'; 
import { fileURLToPath } from 'url'; 
import { createServer } from 'http'; 
import { Server } from 'socket.io'; 
// ✅ Muhammad Ahmed: Path ensured to match your folder structure
import db from './config/db.js';

// Routes Imports
import reportRoutes from './routes/reportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import quizRoutes from './routes/quizRoutes.js'; 
import debugRoutes from './routes/debugRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app); 

// ✅ Socket.io Configuration
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://school-portal-frontend-sigma.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Uploads folder setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

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

// ✅ Static folder link for uploads
app.use('/uploads', express.static(uploadDir));

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

// ✅ MUHAMMAD AHMED: Route Fix for 404 & UI Time Formatting
const getChatHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        const result = await db.query(
            `SELECT room_id as "room", 
                    sender_id as "senderId", 
                    sender_name as "senderName", 
                    message_text as "message", 
                    sender_role as "role", 
                    to_char(created_at, 'DD Mon, HH:MI AM') as "time" 
             FROM messages 
             WHERE room_id = $1
             ORDER BY created_at ASC`,
            [roomId]
        );
        // Agar data nahi hai to empty array bhejein taake UI crash na ho
        res.json(result.rows || []);
    } catch (err) {
        console.error("❌ History Load Error:", err);
        res.status(500).json({ error: "Purani chat load nahi ho saki" });
    }
};

// Registering both routes to ensure frontend finds it (Fixes your 404)
app.get('/api/chat/history/:roomId', getChatHistory);
app.get('/chat/history/:roomId', getChatHistory);

// ✅ API Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/resources', resourceRoutes);

app.get('/', (req, res) => res.send('🚀 Lahore Portal Backend is Running!'));

// --- ✅ SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
    console.log('⚡ New User Connected:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`👤 User joined room: ${roomId}`);
    });

    socket.on('send_message', async (data) => {
        const { senderId, senderName, message, role, room } = data;
        const targetRoom = room || 'GLOBAL_ROOM';
        
        try {
            // Message empty check taake UI saaf rahe
            if(!message || message.trim() === "") return;

            await db.query(
                "INSERT INTO messages (room_id, sender_id, sender_name, message_text, sender_role) VALUES ($1, $2, $3, $4, $5)",
                [targetRoom, senderId, senderName, message, role || 'student']
            );
            
            // Foran response bhejna taake UI real-time update ho
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            io.to(targetRoom).emit('receive_message', {
                ...data,
                time: currentTime,
                room: targetRoom
            });
        } catch (err) {
            console.error("❌ Neon DB Save Error:", err);
        }
    });

    socket.on('typing', (data) => {
        socket.broadcast.to(data.room || 'GLOBAL_ROOM').emit('user_typing', {
            status: data.status,
            userName: data.userName
        });
    });

    socket.on('disconnect', () => {
        console.log('❌ User Disconnected');
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});