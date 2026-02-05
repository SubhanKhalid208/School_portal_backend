import express from 'express';
import pool from '../config/db.js';
const router = express.Router();
import * as teacherController from '../controllers/teacherController.js';

router.get('/stats', async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ error: "Teacher ID missing hai." });

    try {
        const studentCount = await pool.query("SELECT COUNT(*) FROM users WHERE LOWER(role) = 'student'");
        const subjectCount = await pool.query("SELECT COUNT(*) FROM courses WHERE teacher_id = $1", [teacherId]);
        
        const teacherInfo = await pool.query("SELECT name FROM users WHERE id = $1", [teacherId]);

        res.json({
            success: true,
            totalStudents: parseInt(studentCount.rows[0].count) || 0,
            totalSubjects: parseInt(subjectCount.rows[0].count) || 0,
            teacherName: teacherInfo.rows[0]?.name || "Teacher" 
        });
    } catch (err) {
        console.error("Stats Error:", err.message);
        res.status(500).json({ error: "Stats load nahi ho sakay." });
    }
});

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
        console.error("Fetch Error:", err.message);
        res.status(500).json({ error: "Courses load nahi ho sakay." });
    }
});

router.post('/courses/add', async (req, res) => {
    const { title, description, teacher_id } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *",
            [title, description, teacher_id]
        );
        res.status(201).json({ success: true, course: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Add fail: " + err.message });
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
        res.json({ success: true, course: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Update fail." });
    }
});

router.delete('/courses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM courses WHERE id = $1", [id]);
        res.json({ success: true, message: "Deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Delete fail." });
    }
});

router.get('/students', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, "name", email FROM "users" WHERE LOWER(role) = \'student\' ORDER BY "name" ASC');
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/attendance/mark', teacherController.markAttendance);

export default router;