import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload-image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "File upload fail hui!" });

        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        const result = await cloudinary.uploader.upload(fileBase64, {
            folder: "lahore_portal_users",
        });

        res.json({ url: result.secure_url }); 
    } catch (err) {
        res.status(500).json({ error: "Cloudinary Error: " + err.message });
    }
});


router.get('/stats', async (req, res) => {
    try {
        const teachers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'teacher'");
        const students = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'student'");
        const courses = await pool.query("SELECT COUNT(*) FROM courses");

        res.json({
            teachers: parseInt(teachers.rows[0].count),
            students: parseInt(students.rows[0].count),
            subjects: parseInt(courses.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    const { search } = req.query;
    try {
        let queryText = "SELECT id, name, email, role, profile_pic, is_approved FROM users";
        let queryParams = [];

        if (search) {
            queryText += " WHERE (name ILIKE $1 OR email ILIKE $1)";
            queryParams.push(`%${search}%`);
        }

        queryText += " ORDER BY id DESC";

        const users = await pool.query(queryText, queryParams);
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Lahore DB Search Error: " + err.message });
    }
});

router.post('/users', async (req, res) => {
    const { name, email, role, password, profile_pic } = req.body;
    try {
        const newUser = await pool.query(
            "INSERT INTO users (name, email, role, password, profile_pic, is_approved) VALUES ($1, $2, $3, $4, $5, true) RETURNING *",
            [name, email, role, password, profile_pic]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error("CREATE ERROR:", err.message);
        res.status(500).json({ error: "Email already exists or Database error" });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, profile_pic } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET name = $1, email = $2, role = $3, profile_pic = $4 WHERE id = $5",
            [name, email, role, profile_pic, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.json({ success: true, message: "User updated in Lahore Database!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
        res.json({ success: true, message: "User deleted from Lahore Portal!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;