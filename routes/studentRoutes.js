import express from 'express';
import pool from '../config/db.js';
import multer from 'multer'; 
import csv from 'csv-parser'; 
import fs from 'fs'; 
import { verifyToken } from '../middleware/authMiddleware.js'; 
import { sendWelcomeEmail } from '../controllers/authController.js'; 

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// --- 1. BULK UPLOAD WITH AUTO-SUBJECT ENROLLMENT ---
router.post('/bulk-upload', verifyToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: "CSV file upload karna lazmi hai!" });
    }

    const students = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => students.push(data))
        .on('end', async () => {
            try {
                let count = 0;
                for (const student of students) {
                    const { email, dob, name } = student;
                    if (!email) continue;
                    const cleanEmail = email.trim().toLowerCase();

                    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
                    
                    if (checkUser.rows.length === 0) {
                        const insertResult = await pool.query(
                            'INSERT INTO users (email, role, is_approved, dob, name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                            [cleanEmail, 'student', true, dob, name || 'Student']
                        );
                        
                        const newUserId = insertResult.rows[0].id;

                        // Automatic Subject Assignment
                        await pool.query(
                            'INSERT INTO student_courses (student_id, course_id) SELECT $1, id FROM courses',
                            [newUserId]
                        );

                        try {
                            await sendWelcomeEmail(cleanEmail, newUserId);
                        } catch (mailErr) {
                            console.error(`❌ Mail error:`, mailErr.message);
                        }
                        count++;
                    }
                }
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.json({ success: true, message: `${count} students added with subjects!` });
            } catch (err) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.status(500).json({ success: false, error: err.message });
            }
        });
});

// --- 2. NEW ROUTE: FETCH ENROLLED COURSES ONLY ---
// Is route se dashboard par hamesha subjects nazar aayeinge
router.get('/my-courses/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await pool.query(
            `SELECT c.title as subject_name 
             FROM student_courses sc
             JOIN courses c ON sc.course_id = c.id
             WHERE sc.student_id = $1`,
            [studentId]
        );
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: "Courses fetch error: " + err.message });
    }
});

// --- 3. ATTENDANCE STATS & HISTORY ---
router.get('/attendance/student/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    if (!studentId || studentId === 'undefined') {
        return res.status(400).json({ success: false, error: "Student ID missing hai." });
    }
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE LOWER(status) = 'present') as present_days,
                COUNT(*) as total_days
            FROM attendance 
            WHERE student_id = $1
        `;
        const statsResult = await pool.query(statsQuery, [studentId]);
        const present = parseInt(statsResult.rows[0].present_days) || 0;
        const total = parseInt(statsResult.rows[0].total_days) || 0;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        // Use subject_name directly from attendance table to avoid schema mismatch
        const historyQuery = `
            SELECT a.date, a.status, a.subject_name
            FROM attendance a
            WHERE a.student_id = $1
            ORDER BY a.date DESC LIMIT 10
        `;
        const historyResult = await pool.query(historyQuery, [studentId]);
        res.json({
            success: true,
            attendancePercentage: percentage,
            totalPresent: present,
            totalDays: total,
            history: historyResult.rows || []
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Database error: " + err.message });
    }
});

export default router;