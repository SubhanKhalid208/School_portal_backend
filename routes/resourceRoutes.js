import express from 'express';
import pool from '../config/db.js';
import { upload } from '../config/multer.js'; 
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- 1. UPLOAD RESOURCE (Teacher Side) ---
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
    const { title, description, resource_type, course_id, teacher_id, video_link } = req.body;
    
    try {
        let finalPath = '';
        
        if (resource_type === 'video_link' || resource_type === 'link') {
            finalPath = video_link;
        } else {
            if (!req.file) return res.status(400).json({ success: false, error: "File upload karein!" });
            // Consistent path for Lahore Portal
            finalPath = `/uploads/${req.file.filename}`;
        }

        // Muhammad Ahmed: Data insert karte waqt course_id save hogi, 
        // lekin fetch karte waqt hum sab ko dikhayenge.
        const result = await pool.query(
            `INSERT INTO resources (title, description, resource_type, file_path, course_id, teacher_id) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, description || '', resource_type, finalPath, parseInt(course_id), parseInt(teacher_id)]
        );

        res.json({ 
            success: true, 
            message: "Resource published successfully! 🚀", 
            resource: result.rows[0] 
        });
    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 2. GET ALL RESOURCES (Global for all Students) ---
// Muhammad Ahmed, ab ye student ki screen par har uploaded cheez dikhayega
router.get('/course/:courseId', async (req, res) => {
    const { courseId } = req.params;
    try {
        const result = await pool.query(
            `SELECT r.id, r.title, r.description, r.resource_type, 
                    r.file_path as file_url, r.created_at, u.name as teacher_name 
             FROM resources r 
             LEFT JOIN users u ON r.teacher_id = u.id 
             WHERE r.course_id = $1
             ORDER BY r.created_at DESC`,
            [courseId]
        );
        res.json({ success: true, resources: result.rows });
    } catch (err) {
        console.error("Fetch Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;