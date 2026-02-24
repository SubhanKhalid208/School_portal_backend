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
// ✅ Muhammad Ahmed: DB import
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
    credentials: true,
    transports: ['websocket', 'polling']
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

// ✅ MUHAMMAD AHMED: FIXED logic for history - Support for "31_32" format
const getChatHistory = async (req, res) => {
    try {
        let { roomId } = req.params; 
        
        // Muhammad Ahmed: Purani logic 'private_' clean karne ki
        const cleanId = roomId.replace('private_', '');

        const query = `
            SELECT room_id as "room", 
                   sender_id as "senderId", 
                   message_text as "message", 
                   to_char(created_at, 'DD Mon, HH:MI AM') as "time" 
            FROM messages 
            WHERE room_id = $1 
               OR room_id = $2
               OR room_id LIKE $3 
               OR room_id LIKE $4
               OR sender_id::text = $2
               OR receiver_id::text = $2
            ORDER BY created_at ASC
        `;
        
        // Values: Original Room (31_32), Cleaned ID (32), Wildcards for partial matches
        const values = [roomId, cleanId, `${cleanId}_%`, `%_${cleanId}`];
        
        const result = await db.query(query, values);
        
        res.json({
            success: true,
            data: result.rows || []
        });
    } catch (err) {
        console.error("❌ History Load Error:", err);
        res.status(500).json({ 
            success: false, 
            error: "Purani chat load nahi ho saki" 
        });
    }
};

app.get('/api/chat/chat-history/:roomId', getChatHistory);
app.get('/chat/chat-history/:roomId', getChatHistory);

// API Routes Setup
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
        const { senderId, receiverId, message, room } = data;
        const targetRoom = room || 'GLOBAL_ROOM';
        
        // ✅ Muhammad Ahmed: Extraction logic standardized for 31_32
        let finalReceiverId = null;
        if (receiverId && !isNaN(receiverId)) {
            finalReceiverId = parseInt(receiverId);
        } else if (targetRoom.includes('_')) {
            const parts = targetRoom.split('_');
            // Room name se woh ID nikalna jo sender ki nahi hai (yani receiver ki hai)
            const numericId = parts.find(p => !isNaN(p) && String(p) !== String(senderId));
            finalReceiverId = numericId ? parseInt(numericId) : 1; 
        } else {
            finalReceiverId = 1; 
        }

        try {
            if(!message || message.trim() === "") return;

            // Database Save
            await db.query(
                "INSERT INTO messages (room_id, sender_id, receiver_id, message_text) VALUES ($1, $2, $3, $4)",
                [targetRoom, senderId, finalReceiverId, message]
            );
            
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const responseData = {
                ...data,
                time: currentTime,
                room: targetRoom
            };

            // ✅ Broadcast to target room (31_32)
            io.to(targetRoom).emit('receive_message', responseData);
            
            // ✅ Fallback for individual delivery
            if (receiverId) {
                io.to(receiverId.toString()).emit('receive_message', responseData);
            }

        } catch (err) {
            console.error("❌ Neon DB Save Error:", err.message);
        }
    });

    socket.on('typing', (data) => {
        const targetRoom = data.room || 'GLOBAL_ROOM';
        socket.broadcast.to(targetRoom).emit('user_typing', {
            status: data.status,
            userName: data.userName,
            room: targetRoom
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