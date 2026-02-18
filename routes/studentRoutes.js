import express from 'express';
import pool from '../config/db.js';
import multer from 'multer'; 
import csv from 'csv-parser'; 
import fs from 'fs'; 
import path from 'path'; 
import { verifyToken } from '../middleware/authMiddleware.js'; 
import { sendWelcomeEmail } from '../controllers/authController.js'; 
import { upload } from '../config/multer.js'; // ✅ Shared multer config

const router = express.Router();

const csvUpload = multer({ dest: '/tmp/' });

// --- 1. HELPER TO DETECT COLUMN ---
let _assignmentCol = null;
const getAssignmentColumn = async () => {
    if (_assignmentCol) return _assignmentCol;
    try {
        const res = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name='quiz_results' AND column_name IN ('assignment_id','quiz_assignment_id','assignmentid') LIMIT 1"
        );
        _assignmentCol = res.rows[0]?.column_name || 'assignment_id';
    } catch (err) {
        _assignmentCol = 'assignment_id';
    }
    return _assignmentCol;
};

// --- 2. BULK UPLOAD ---
router.post('/bulk-upload', verifyToken, csvUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: "CSV file upload karna lazmi hai!" });
    const students = [];
    const filePath = req.file.path;
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => { if (data.email) students.push(data); })
        .on('error', (err) => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            res.status(500).json({ success: false, error: "CSV error" });
        })
        .on('end', async () => {
            const client = await pool.connect(); 
            try {
                await client.query('BEGIN'); 
                let count = 0;
                for (const student of students) {
                    const cleanEmail = student.email.trim().toLowerCase();
                    const checkUser = await client.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
                    if (checkUser.rows.length === 0) {
                        const insertResult = await client.query(
                            'INSERT INTO users (email, role, is_approved, dob, name, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                            [cleanEmail, 'student', true, student.dob || null, student.name || 'Student', 'student123']
                        );
                        const newUserId = insertResult.rows[0].id;
                        await client.query('INSERT INTO student_courses (student_id, course_id) SELECT $1, id FROM courses ON CONFLICT DO NOTHING', [newUserId]);
                        count++;
                    }
                }
                await client.query('COMMIT'); 
                res.json({ success: true, message: `Lahore Portal: ${count} students added!` });
            } catch (err) {
                await client.query('ROLLBACK'); 
                res.status(500).json({ success: false, error: err.message });
            } finally {
                client.release();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
            }
        });
});

// --- 3. FETCH ENROLLED COURSES ---
router.get('/my-courses/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await pool.query(
            `SELECT c.id, c.title as subject_name, c.description FROM student_courses sc JOIN courses c ON sc.course_id = c.id WHERE sc.student_id = $1`, [studentId]
        );
        res.json({ success: true, courses: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 4. ATTENDANCE STATS ---
router.get('/attendance/student/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    try {
        const statsResult = await pool.query(`
            SELECT u.name as student_name, u.profile_pic as student_image, COUNT(a.id) as total_days, COUNT(a.id) FILTER (WHERE LOWER(a.status) = 'present') as present_days
            FROM users u LEFT JOIN attendance a ON u.id = a.student_id WHERE u.id = $1 GROUP BY u.id`, [studentId]);
        const row = statsResult.rows[0] || {};
        const present = parseInt(row.present_days) || 0;
        const total = parseInt(row.total_days) || 0;
        const history = await pool.query(`SELECT date, status, subject_name FROM attendance WHERE student_id = $1 ORDER BY date DESC LIMIT 15`, [studentId]);
        res.json({
            success: true,
            data: {
                studentName: row.student_name, profile_pic: row.student_image,
                attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
                totalPresent: present, totalDays: total, history: history.rows
            }
        });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 5. PROFILE PICTURE ---
router.post('/upload-profile-pic/:studentId', verifyToken, upload.single('profilePic'), async (req, res) => {
    const { studentId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: "No image" });
    try {
        const imagePath = `/uploads/${req.file.filename}`; 
        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [imagePath, studentId]);
        res.json({ success: true, profile_pic: imagePath });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 6. STUDENT ANALYTICS (FIXED FOR GRAPH) ---
router.get('/analytics/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    try {
        const col = await getAssignmentColumn();
        
        // Quiz Data for Graph
        const quizResults = await pool.query(`
            SELECT q.title as subject, qr.score, q.total_marks
            FROM quiz_results qr
            INNER JOIN quiz_assignments qa ON qr.${col} = qa.id
            INNER JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qr.student_id = $1`, [studentId]);

        // Monthly Attendance for Graph
        const attendanceTrend = await pool.query(`
            SELECT TO_CHAR(date, 'Mon') as month,
            COUNT(*) FILTER (WHERE LOWER(status) = 'present') as present,
            COUNT(*) as total
            FROM attendance
            WHERE student_id = $1
            GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date)
            ORDER BY EXTRACT(MONTH FROM date)`, [studentId]);

        res.json({ 
            success: true, 
            data: { 
                quizTrends: quizResults.rows.map(r => ({
                    subject: r.subject,
                    percentage: r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0
                })),
                attendanceTrends: attendanceTrend.rows 
            } 
        });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 7. MY QUIZZES ---
router.get('/quiz/student/my-quizzes/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params;
    try {
        const col = await getAssignmentColumn();
        const result = await pool.query(`
            SELECT qr.*, q.title as quiz_title FROM quiz_results qr
            JOIN quiz_assignments qa ON qr.${col} = qa.id
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qr.student_id = $1`, [studentId]);
        res.json({ success: true, quizzes: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- 8. SUBJECT DETAILS (FIXED: NO SUBJECT FILTER) ---
router.get('/subject-details/:courseId/:studentId', verifyToken, async (req, res) => {
    const { studentId } = req.params; 
    try {
        const col = await getAssignmentColumn();
        
        const quizQuery = `
            SELECT 
                q.id, q.title, q.total_marks, qr.score, qr.status,
                'Done' as quiz_status
            FROM quiz_results qr
            JOIN quiz_assignments qa ON qr.${col} = qa.id
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qr.student_id = $1
            ORDER BY qr.created_at DESC LIMIT 20
        `;

        const attQuery = `
            SELECT 
                COUNT(*) as total_classes,
                COUNT(*) FILTER (WHERE LOWER(status) = 'present') as present_count
            FROM attendance 
            WHERE student_id = $1
        `;

        const [quizzes, attendance] = await Promise.all([
            pool.query(quizQuery, [studentId]),
            pool.query(attQuery, [studentId])
        ]);

        const attRow = attendance.rows[0];
        res.json({
            success: true,
            quizzes: quizzes.rows,
            attendance: {
                total: parseInt(attRow.total_classes) || 0,
                present: parseInt(attRow.present_count) || 0,
                percentage: attRow.total_classes > 0 ? Math.round((attRow.present_count / attRow.total_classes) * 100) : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;