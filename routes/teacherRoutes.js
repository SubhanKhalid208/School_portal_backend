import express from 'express';
import pool from '../config/db.js';
const router = express.Router();
import * as teacherController from '../controllers/teacherController.js';

// --- 1. GET DASHBOARD STATS (Optimized) ---
router.get('/stats', async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ error: "Teacher ID missing hai." });

    try {
        // Optimized: Ek hi request mein saara data
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
        res.status(500).json({ error: "Lahore DB stats load nahi ho sakay." });
    }
});

// --- 2. MANAGE COURSES (CRUD) ---
router.get('/my-courses', async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ error: "Teacher ID missing hai." });

    try {
        const result = await pool.query(
            "SELECT id, title AS name, description FROM courses WHERE teacher_id = $1 ORDER BY id DESC",
            [teacherId]
        );
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: "Courses load nahi ho sakay." });
    }
});

router.post('/courses/add', async (req, res) => {
    const { title, description, teacher_id } = req.body;
    if (!title || !teacher_id) return res.status(400).json({ error: "Title aur Teacher ID lazmi hain." });

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

router.put('/courses/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        const result = await pool.query(
            "UPDATE courses SET title = $1, description = $2 WHERE id = $3 RETURNING *",
            [title, description, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Course nahi mila." });
        res.json({ success: true, course: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Update process fail ho gaya." });
    }
});

router.delete('/courses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Pehle attendance/enrollment delete karni par sakti hai agar schema restrict hai
        // Filhal direct delete:
        const result = await pool.query("DELETE FROM courses WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Course pehle hi delete ho chuka hai." });
        res.json({ success: true, message: "Deleted successfully from Lahore Portal." });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: "Delete fail: Is course mein students enrolled ho saktay hain." });
    }
});

// --- 3. ATTENDANCE & STUDENTS ---
router.get('/students', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email FROM users WHERE LOWER(role) = \'student\' ORDER BY name ASC');
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ success: false, error: "Students list load nahi ho saki." });
    }
});

router.post('/attendance/mark', teacherController.markAttendance);

export default router;