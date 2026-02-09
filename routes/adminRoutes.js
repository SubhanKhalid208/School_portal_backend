import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import bcrypt from 'bcryptjs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 1. Image Upload to Cloudinary
router.post('/upload-image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "File upload fail hui!" });

        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        const result = await cloudinary.uploader.upload(fileBase64, {
            folder: "lahore_portal_users",
        });

        res.json({ success: true, url: result.secure_url }); 
    } catch (err) {
        console.error("Cloudinary Error:", err);
        res.status(500).json({ success: false, error: "Cloudinary upload fail ho gaya." });
    }
});

// 2. Admin Stats (Fixed for Frontend compatibility)
router.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'teacher') as teachers,
                (SELECT COUNT(*) FROM users WHERE role = 'student') as students,
                (SELECT COUNT(*) FROM courses) as subjects
        `;
        const stats = await pool.query(query);
        
        // Success wrapper add kiya hai taake frontend fetch handle kar sake
        res.json({
            success: true,
            data: {
                teachers: parseInt(stats.rows[0].teachers) || 0,
                students: parseInt(stats.rows[0].students) || 0,
                subjects: parseInt(stats.rows[0].subjects) || 0
            }
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, error: "Stats load nahi ho sakay." });
    }
});

// 3. Get All Users (with Search)
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
        res.json({ success: true, data: users.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: "User search error in Lahore DB." });
    }
});

// 4. Create User (Secure Version)
router.post('/users', async (req, res) => {
    const { name, email, role, password, profile_pic } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || 'lahore123', salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, role, password, profile_pic, is_approved) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, role",
            [name, email, role, hashedPassword, profile_pic]
        );
        res.status(201).json({ success: true, data: newUser.rows[0] });
    } catch (err) {
        console.error("CREATE ERROR:", err.message);
        res.status(500).json({ success: false, error: "Email pehle se maujood hai!" });
    }
});

// 5. Update User
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, profile_pic } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET name = $1, email = $2, role = $3, profile_pic = $4 WHERE id = $5",
            [name, email, role, profile_pic, id]
        );
        
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: "User nahi mila." });
        
        res.json({ success: true, message: "Lahore Database updated!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Delete User
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: "User missing." });
        res.json({ success: true, message: "User deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, error: "Delete fail: User kisi record se linked ho sakta hai." });
    }
});

export default router;