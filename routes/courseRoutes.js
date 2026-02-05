import express from 'express';
import pool from '../config/db.js'; 

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, title AS name FROM courses ORDER BY title ASC");
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Courses Fetch Error:", err.message); 
        res.status(500).json({ success: false, error: "Courses load nahi ho sakay!" });
    }
});

router.post('/', async (req, res) => {
    const { name, description } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING *",
            [name, description]
        );
        res.status(201).json({ success: true, course: result.rows[0] });
    } catch (err) {
        console.error("Add Course Error:", err.message);
        res.status(500).json({ success: false, error: "Naya course add nahi ho saka." });
    }
});

export default router;