import express from 'express';
import pool from '../config/db.js';
import multer from 'multer'; 
import csv from 'csv-parser'; 
import fs from 'fs'; 
import { verifyToken } from '../middleware/authMiddleware.js'; 
import { sendWelcomeEmail } from '../controllers/authController.js'; 

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// --- 1. BULK UPLOAD (Optimized with Database Transactions) ---
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
            const client = await pool.connect(); // Use a single client for transaction
            try {
                await client.query('BEGIN'); // Transaction start karein
                let count = 0;

                for (const student of students) {
                    const { email, dob, name } = student;
                    if (!email) continue;
                    const cleanEmail = email.trim().toLowerCase();

                    const checkUser = await client.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
                    
                    if (checkUser.rows.length === 0) {
                        // User insert
                        const insertResult = await client.query(
                            'INSERT INTO users (email, role, is_approved, dob, name, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                            [cleanEmail, 'student', true, dob || null, name || 'Student', 'student123']
                        );
                        
                        const newUserId = insertResult.rows[0].id;

                        // ✅ Auto-enrollment in all courses
                        await client.query(
                            'INSERT INTO student_courses (student_id, course_id) SELECT $1, id FROM courses',
                            [newUserId]
                        );

                        // Email async bhejien taake loop slow na ho
                        sendWelcomeEmail(cleanEmail, newUserId).catch(e => console.error("Mail Error:", e.message));
                        
                        count++;
                    }
                }
                
                await client.query('COMMIT'); // Sab sahi raha toh save karein
                res.json({ success: true, message: `Lahore Portal: ${count} students successfully enroll ho gaye!` });
            } catch (err) {
                await client.query('ROLLBACK'); // Masla hua toh sab cancel karein
                console.error("Bulk Upload Error:", err);
                res.status(500).json({ success: false, error: "Database error during upload." });
            } finally {
                client.release();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Delete file always
            }
        });
});

// --- 2. FETCH ENROLLED COURSES ---
router.get('/my-courses/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    if (!studentId || studentId === 'undefined') return res.status(400).json({ error: "ID missing" });

    try {
        const result = await pool.query(
            `SELECT c.id, c.title as subject_name, c.description 
             FROM student_courses sc
             JOIN courses c ON sc.course_id = c.id
             WHERE sc.student_id = $1`,
            [studentId]
        );
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 3. ATTENDANCE STATS (Optimized Query) ---
router.get('/attendance/student/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    if (!studentId || studentId === 'undefined') {
        return res.status(400).json({ success: false, error: "Student ID missing hai." });
    }
    try {
        // Ek hi query mein present aur total count
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_days,
                COUNT(*) FILTER (WHERE LOWER(status) = 'present') as present_days
            FROM attendance WHERE student_id = $1`, 
            [studentId]
        );

        const present = parseInt(statsResult.rows[0].present_days) || 0;
        const total = parseInt(statsResult.rows[0].total_days) || 0;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        const historyResult = await pool.query(`
            SELECT date, status, subject_name FROM attendance 
            WHERE student_id = $1 ORDER BY date DESC LIMIT 15`, 
            [studentId]
        );

        res.json({
            success: true,
            attendancePercentage: percentage,
            totalPresent: present,
            totalDays: total,
            history: historyResult.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;