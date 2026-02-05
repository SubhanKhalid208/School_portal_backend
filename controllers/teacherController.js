import pool from '../config/db.js';

export const getStats = async (req, res) => {
    const { teacherId } = req.query; 
    
    try {
        if (!teacherId) {
            return res.status(400).json({ error: "Teacher ID missing hai." });
        }
        const studentRes = await pool.query("SELECT COUNT(*) FROM users WHERE LOWER(role) = 'student'");
        
        const subjectRes = await pool.query("SELECT COUNT(*) FROM courses WHERE teacher_id = $1", [teacherId]);

        res.json({ 
            success: true, 
            totalStudents: parseInt(studentRes.rows[0].count) || 0,
            totalSubjects: parseInt(subjectRes.rows[0].count) || 0 
        });
    } catch (err) {
        console.error("Stats Error:", err.message); 
        res.status(500).json({ error: "Stats load nahi ho sakay: " + err.message });
    }
};

export const markAttendance = async (req, res) => {
    const { studentId, courseId, status, date, teacherId } = req.body;
    const attDate = date || new Date().toISOString().split('T')[0];

    try {
        const existing = await pool.query(
            "SELECT id FROM attendance WHERE student_id = $1 AND course_id = $2 AND date = $3",
            [studentId, courseId, attDate]
        );

        if (existing.rows.length > 0) {
            await pool.query("UPDATE attendance SET status = $1 WHERE id = $2", [status, existing.rows[0].id]);
        } else {
            await pool.query(
                "INSERT INTO attendance (student_id, course_id, status, date, teacher_id) VALUES ($1, $2, $3, $4, $5)",
                [studentId, courseId, status, attDate, teacherId]
            );
        }
        res.json({ success: true, message: "Attendance record updated!" });
    } catch (err) {
        console.error("Attendance Mark Error:", err.message);
        res.status(500).json({ error: "Attendance save nahi ho saki." });
    }
};