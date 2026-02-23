import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- 1. Attendance Summary (With VerifyToken) ---
router.get('/attendance-summary', verifyToken, async (req, res) => {
    try {
        const query = `
            WITH AttendanceCalculations AS (
                SELECT 
                    s.id AS student_id,
                    s.name AS student_name,
                    COUNT(a.id) AS total_sessions,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count
                FROM users s
                LEFT JOIN attendance a ON s.id = a.student_id
                WHERE s.role = 'student'
                GROUP BY s.id, s.name
            )
            SELECT 
                student_id,
                student_name,
                total_sessions,
                present_count,
                absent_count,
                CASE 
                    WHEN total_sessions > 0 THEN ROUND((present_count::numeric / total_sessions) * 100, 2)
                    ELSE 0 
                END AS attendance_percentage
            FROM AttendanceCalculations
            ORDER BY attendance_percentage DESC;
        `;

        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Report Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 2. Student Attendance Report (Direct API for Frontend) ---
router.get('/student-attendance-report', async (req, res) => {
    try {
        const query = `
            WITH AttendanceCalculations AS (
                SELECT 
                    s.id AS student_id,
                    s.name AS student_name,
                    COUNT(a.id) AS total_sessions,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count
                FROM users s
                LEFT JOIN attendance a ON s.id = a.student_id
                WHERE s.role = 'student'
                GROUP BY s.id, s.name
            )
            SELECT 
                student_id,
                student_name,
                total_sessions,
                present_count,
                absent_count,
                CASE 
                    WHEN total_sessions > 0 THEN ROUND((present_count::numeric / total_sessions) * 100, 2)
                    ELSE 0 
                END AS attendance_percentage
            FROM AttendanceCalculations
            ORDER BY attendance_percentage DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- 3. NAYA TASK: Teacher Course Load Report (Complex SQL) ---
// Muhammad Ahmed, ye wahi complex query hai jo senior ko dikhani hai
// Is query ko apne backend mein update karein
// Muhammad Ahmed, ye wala route ab 100% chalega
router.get('/teacher-course-load', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id AS teacher_id,
                u.name AS teacher_name,
                u.email AS teacher_email,
                COUNT(DISTINCT c.id) AS total_subjects,
                COUNT(DISTINCT q.id) AS total_quizzes
            FROM users u
            LEFT JOIN courses c ON u.id = c.teacher_id
            LEFT JOIN quizzes q ON u.id = q.created_by
            WHERE u.role = 'teacher' OR u.id IN (SELECT DISTINCT teacher_id FROM courses)
            GROUP BY u.id, u.name, u.email
            ORDER BY total_subjects DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Muhammad Ahmed, Workload Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 1. Top Students Report
router.get('/top-students', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.name AS student_name,
                COUNT(qr.id) AS quizzes_attempted,
                ROUND(AVG(qr.score), 2) AS average_score,
                MAX(qr.score) AS highest_score
            FROM users u
            JOIN quiz_results qr ON u.id = qr.student_id
            GROUP BY u.id, u.name
            ORDER BY average_score DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Top Students:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Course Popularity Report
router.get('/course-popularity', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.title AS course_title,
                u.name AS instructor_name,
                COUNT(sc.id) AS total_enrollments
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            LEFT JOIN student_courses sc ON c.id = sc.course_id
            GROUP BY c.id, c.title, u.name
            ORDER BY total_enrollments DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in Course Popularity:", err.message);
        res.status(500).json({ error: err.message });
    }
});
export default router;