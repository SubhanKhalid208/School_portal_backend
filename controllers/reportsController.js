import db from '../config/db.js'; // Muhammad Ahmed, apne DB config ka path check kar lein

// --- 1. Student Attendance Report (Report 1) ---
export const getStudentAttendanceReport = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id AS student_id,
                u.name AS student_name,
                COUNT(a.id) AS total_sessions,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
                ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(a.id)) * 100, 2) AS attendance_percentage
            FROM users u
            JOIN attendance a ON u.id = a.student_id
            WHERE u.role = 'student'
            GROUP BY u.id, u.name
            ORDER BY attendance_percentage DESC;
        `;

        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Attendance Report Error:", error);
        res.status(500).json({ message: "Attendance report fetch karne mein masla aya" });
    }
};

// --- 2. Teacher Course Load Report (Report 2 - Complex Query) ---
export const getTeacherCourseLoad = async (req, res) => {
    try {
        // Senior ke liye Long Query (CTE use ki hai)
        const query = `
            WITH TeacherStats AS (
                -- Har teacher ke assigned subjects count karein
                SELECT 
                    u.id AS teacher_id,
                    u.name AS teacher_name,
                    u.email AS teacher_email,
                    COUNT(DISTINCT c.id) AS total_subjects_assigned
                FROM users u
                LEFT JOIN courses c ON u.id = c.teacher_id
                WHERE u.role = 'teacher'
                GROUP BY u.id, u.name, u.email
            ),
            QuizStats AS (
                -- Har teacher ne kitne quizzes banaye
                SELECT 
                    teacher_id,
                    COUNT(id) AS total_quizzes_created
                FROM quizzes
                GROUP BY teacher_id
            ),
            StudentStats AS (
                -- Har teacher ke subjects mein total kitne students hain
                SELECT 
                    c.teacher_id,
                    COUNT(e.student_id) AS total_students_enrolled
                FROM courses c
                LEFT JOIN enrollments e ON c.id = e.course_id
                GROUP BY c.teacher_id
            )
            -- Sab tables ko jorh kar final report banana
            SELECT 
                ts.teacher_id,
                ts.teacher_name,
                ts.teacher_email,
                ts.total_subjects_assigned,
                COALESCE(qs.total_quizzes_created, 0) AS total_quizzes,
                COALESCE(ss.total_students_enrolled, 0) AS total_students
            FROM TeacherStats ts
            LEFT JOIN QuizStats qs ON ts.teacher_id = qs.teacher_id
            LEFT JOIN StudentStats ss ON ts.teacher_id = ss.teacher_id
            ORDER BY ts.total_subjects_assigned DESC;
        `;

        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Teacher Report Error:", error);
        res.status(500).json({ message: "Teacher course load fetch karne mein masla aya" });
    }
};