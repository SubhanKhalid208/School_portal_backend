import pool from '../config/db.js';

export const getCourses = async (req, res) => {
    try {
        const courses = await pool.query("SELECT * FROM courses ORDER BY id DESC");
        res.json(courses.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const addCourse = async (req, res) => {
    const { title, description } = req.body;
    try {
        const newCourse = await pool.query(
            "INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING *",
            [title, description]
        );
        res.status(201).json(newCourse.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};