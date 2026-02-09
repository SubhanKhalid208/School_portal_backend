import express from 'express';
import pool from '../config/db.js'; 

const router = express.Router();

// 1. Get All Courses
router.get('/', async (req, res) => {
    try {
        // Hum title ko AS name le rahe hain taake frontend mapping mein masla na ho
        const result = await pool.query("SELECT id, title, title AS name, description FROM courses ORDER BY title ASC");
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Courses Fetch Error:", err.message); 
        res.status(500).json({ success: false, error: "Courses load nahi ho sakay!" });
    }
});

// 2. Add New Course (Updated with teacher_id)
router.post('/', async (req, res) => {
    const { name, title, description, teacher_id } = req.body;
    
    // Title handle karne ke liye (kabhi frontend 'name' bhejta hai kabhi 'title')
    const finalTitle = title || name;

    if (!finalTitle) {
        return res.status(400).json({ success: false, error: "Subject ka naam lazmi hai!" });
    }

    try {
        // ✅ CRITICAL FIX: teacher_id add kiya taake teacher dashboard mein show ho
        const result = await pool.query(
            "INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *",
            [finalTitle, description, teacher_id || null]
        );
        res.status(201).json({ success: true, course: result.rows[0] });
    } catch (err) {
        console.error("Add Course Error:", err.message);
        res.status(500).json({ success: false, error: "Naya course add nahi ho saka." });
    }
});

export default router;