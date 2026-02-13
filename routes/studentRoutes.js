import express from 'express';
import pool from '../config/db.js';
import multer from 'multer'; 
import csv from 'csv-parser'; 
import fs from 'fs'; 
import { verifyToken } from '../middleware/authMiddleware.js'; 
import { sendWelcomeEmail } from '../controllers/authController.js'; 

const router = express.Router();

// Production (Railway) ke liye /tmp folder behtar hai
const upload = multer({ dest: '/tmp/' });

// --- 1. BULK UPLOAD ---
router.post('/bulk-upload', verifyToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: "CSV file upload karna lazmi hai!" });
    }

    const students = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
            if (data.email) students.push(data);
        })
        .on('error', (err) => {
            console.error("CSV Parsing Error:", err.message);
            res.status(500).json({ success: false, error: "CSV file format sahi nahi hai." });
        })
        .on('end', async () => {
            if (students.length === 0) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return res.status(400).json({ success: false, error: "CSV file khali hai!" });
            }

            const client = await pool.connect(); 
            try {
                await client.query('BEGIN'); 
                let count = 0;

                for (const student of students) {
                    const { email, dob, name } = student;
                    const cleanEmail = email.trim().toLowerCase();

                    const checkUser = await client.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
                    
                    if (checkUser.rows.length === 0) {
                        const insertResult = await client.query(
                            'INSERT INTO users (email, role, is_approved, dob, name, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                            [cleanEmail, 'student', true, dob || null, name || 'Student', 'student123']
                        );
                        
                        const newUserId = insertResult.rows[0].id;

                        await client.query(
                            'INSERT INTO student_courses (student_id, course_id) SELECT $1, id FROM courses ON CONFLICT DO NOTHING',
                            [newUserId]
                        );

                        if (typeof sendWelcomeEmail === 'function') {
                            sendWelcomeEmail(cleanEmail, newUserId).catch(e => console.error("Mail Error:", e.message));
                        }
                        
                        count++;
                    }
                }
                
                await client.query('COMMIT'); 
                res.json({ success: true, message: `Lahore Portal: ${count} students enroll ho gaye!` });

            } catch (err) {
                await client.query('ROLLBACK'); 
                res.status(500).json({ success: false, error: err.message });
            } finally {
                client.release();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
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

// --- 3. ATTENDANCE STATS ---
router.get('/attendance/student/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    if (!studentId || studentId === 'undefined') {
        return res.status(400).json({ success: false, error: "Student ID missing hai." });
    }
    try {
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
            data: {
                attendancePercentage: percentage,
                totalPresent: present,
                totalDays: total,
                history: historyResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. STUDENT ANALYTICS (FIXED FOR LIVE DATABASE) ---
router.get('/analytics/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    
    console.log("📡 Fetching Analytics for Student ID:", studentId);

    if (!studentId || studentId === 'undefined' || studentId === 'null') {
        return res.status(400).json({ success: false, error: "Invalid Student ID" });
    }

    try {
        // FIXED QUERY: Jo columns live DB mein missing thay unko handle kiya hai
        // qr.quiz_id ki jagah check kiya ke quizzes table se sahi link ho
        const quizResults = await pool.query(`
            SELECT 
                q.title as subject, 
                ROUND((CAST(qr.score AS FLOAT) / NULLIF(CAST(q.total_marks AS FLOAT), 0)) * 100) as percentage
            FROM quiz_results qr
            INNER JOIN quizzes q ON qr.quiz_id = q.id 
            WHERE qr.student_id = $1
            ORDER BY qr.created_at ASC`, [studentId]
        );

        // Attendance Monthly Trends
        const attendanceTrend = await pool.query(`
            SELECT TO_CHAR(date, 'Mon') as month,
            COUNT(*) FILTER (WHERE LOWER(status) = 'present') as present,
            COUNT(*) as total
            FROM attendance
            WHERE student_id = $1
            GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date)
            ORDER BY EXTRACT(MONTH FROM date)`, [studentId]
        );

        res.json({
            success: true,
            data: {
                quizTrends: quizResults.rows,
                attendanceTrends: attendanceTrend.rows
            }
        });
    } catch (err) {
        console.error("❌ Analytics Route Error:", err.message);
        res.status(500).json({ 
            success: false, 
            error: "Database Structure Error: " + err.message 
        });
    }
});

export default router;