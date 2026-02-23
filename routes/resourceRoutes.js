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
            finalPath = `/uploads/${req.file.filename}`;
        }

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

// --- 2. GET ALL RESOURCES (Muhammad Ahmed: GLOBAL VIEW) ---
router.get(['/course/:courseId', '/:courseId'], async (req, res) => {
    try {
        // ✅ ZAROORI: Browser ko 304 status se rokne ke liye
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

        const result = await pool.query(
            `SELECT r.id, r.title, r.description, r.resource_type, 
                    r.file_path as file_url, r.created_at, u.name as teacher_name 
             FROM resources r 
             LEFT JOIN users u ON r.teacher_id = u.id 
             ORDER BY r.created_at DESC`
        );

        res.json({ 
            success: true, 
            resources: result.rows 
        });
    } catch (err) {
        console.error("Fetch Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 3. DELETE RESOURCE (Muhammad Ahmed: Teacher Access) ---
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM resources WHERE id = $1 RETURNING *", [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Resource nahi mila!" });
        }

        res.json({ success: true, message: "Resource deleted successfully! 🗑️" });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. UPDATE/EDIT RESOURCE (Muhammad Ahmed: Teacher Access) ---
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { title, description, video_link } = req.body;
    
    try {
        // Sirf Title, Description ya Link ko update karne ke liye
        const result = await pool.query(
            `UPDATE resources 
             SET title = $1, description = $2, file_path = COALESCE($3, file_path) 
             WHERE id = $4 RETURNING *`,
            [title, description, video_link, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Update fail: Resource nahi mila!" });
        }

        res.json({ 
            success: true, 
            message: "Resource updated successfully! ✏️", 
            resource: result.rows[0] 
        });
    } catch (err) {
        console.error("Update Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;