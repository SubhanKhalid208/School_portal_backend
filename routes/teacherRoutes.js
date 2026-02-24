import express from 'express';
import pool from '../config/db.js';
const router = express.Router();
import * as teacherController from '../controllers/teacherController.js';

// ✅ JWT Middleware Import
import { verifyToken } from '../middleware/authMiddleware.js';
import { upload } from '../config/multer.js';

// --- 1. GET DASHBOARD STATS (Secure) ---
router.get('/stats', verifyToken, async (req, res) => {
    const teacherId = req.user.id; 

    try {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE LOWER(role) = 'student') as total_students,
                (SELECT COUNT(*) FROM courses WHERE teacher_id = $1) as total_subjects,
                (SELECT name FROM users WHERE id = $1) as teacher_name
        `;
        const result = await pool.query(statsQuery, [teacherId]);
        const data = result.rows[0];

        res.json({
            success: true,
            totalStudents: parseInt(data.total_students) || 0,
            totalSubjects: parseInt(data.total_subjects) || 0,
            teacherName: data.teacher_name || "Teacher" 
        });
    } catch (err) {
        console.error("❌ Stats Error:", err.message);
        res.status(500).json({ success: false, error: "Lahore DB stats load nahi ho sakay." });
    }
});

// --- 2. MANAGE COURSES (Secure CRUD) ---
router.get('/my-courses', verifyToken, async (req, res) => {
    const teacherId = req.user.id; 

    try {
        const result = await pool.query(
            "SELECT id, title AS name, description FROM courses WHERE teacher_id = $1 ORDER BY id DESC",
            [teacherId]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: "Courses load nahi ho sakay." });
    }
});

router.post('/courses/add', verifyToken, async (req, res) => {
    const { title, description } = req.body;
    const teacher_id = req.user.id;

    if (!title) return res.status(400).json({ error: "Title lazmi hai." });

    try {
        const result = await pool.query(
            "INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *",
            [title, description, teacher_id]
        );
        res.status(201).json({ success: true, course: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Course add fail ho gaya." });
    }
});

router.put('/courses/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const teacherId = req.user.id;

    try {
        const result = await pool.query(
            "UPDATE courses SET title = $1, description = $2 WHERE id = $3 AND teacher_id = $4 RETURNING *",
            [title, description, id, teacherId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Course nahi mila ya ijazat nahi." });
        res.json({ success: true, course: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Update process fail ho gaya." });
    }
});

router.delete('/courses/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const teacherId = req.user.id;
    try {
        const result = await pool.query("DELETE FROM courses WHERE id = $1 AND teacher_id = $2", [id, teacherId]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Delete fail: Course nahi mila." });
        res.json({ success: true, message: "Deleted successfully from Lahore Portal." });
    } catch (err) {
        res.status(500).json({ error: "Delete fail: Is course mein data ho sakta hai." });
    }
});

// --- 3. ATTENDANCE & REGISTERED STUDENTS ---
router.get('/all-students', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, profile_pic FROM users WHERE LOWER(role) = \'student\' ORDER BY name ASC'
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error("❌ Fetch Students Error:", err.message);
        res.status(500).json({ success: false, error: "Students list load nahi ho saki." });
    }
});

router.get('/students', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email FROM users WHERE LOWER(role) = \'student\' ORDER BY name ASC');
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: "Students list load nahi ho saki." });
    }
});

router.post('/attendance/mark', verifyToken, teacherController.markAttendance);

// --- 4. PRIVATE CHAT HISTORY (Muhammad Ahmed: Naye table structure ke liye) ---
router.get('/chat-history/:roomId', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                room_id as "room", 
                sender_id as "senderId", 
                message_text as "message", 
                to_char(created_at, 'DD Mon, HH:MI AM') as "time" 
             FROM messages 
             WHERE room_id = $1 
             ORDER BY created_at ASC`,
            [roomId]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error("❌ Chat History Error:", err.message);
        res.status(500).json({ success: false, error: "Purani chat load nahi ho saki." });
    }
});

// --- 5. TEACHER PROFILE PICTURE UPLOAD ---
router.post('/upload-profile-pic/:teacherId', verifyToken, upload.single('profilePic'), async (req, res) => {
    const { teacherId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: "Image select karna lazmi hai!" });

    try {
        const imagePath = `/uploads/${req.file.filename}`; 
        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [imagePath, teacherId]);
        res.json({ success: true, message: "Profile picture update ho gayi!", profile_pic: imagePath });
    } catch (err) {
        res.status(500).json({ success: false, error: "Upload Error: " + err.message });
    }
});

export default router;