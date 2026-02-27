import pool from '../config/db.js';

// --- 1. GET DASHBOARD STATS ---
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

// --- 2. ATTENDANCE LOGIC ---
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

// --- 3. TEACHER CLOUD NOTES (Muhammad Ahmed: Naya Logic Yahan Hai) ---

// Get all notes for the logged-in teacher
export const getNotes = async (req, res) => {
    const teacherId = req.user.id; // verifyToken middleware se ID mil rahi hai
    try {
        const result = await pool.query(
            'SELECT * FROM teacher_notes WHERE teacher_id = $1 ORDER BY created_at DESC', 
            [teacherId]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error("Fetch Notes Error:", err.message);
        res.status(500).json({ success: false, error: "Notes fetch nahi ho sakay." });
    }
};

// Add a new note
export const addNote = async (req, res) => {
    const { text } = req.body;
    const teacherId = req.user.id;
    if (!text) return res.status(400).json({ error: "Note empty nahi ho sakta." });

    try {
        const result = await pool.query(
            'INSERT INTO teacher_notes (teacher_id, text) VALUES ($1, $2) RETURNING *',
            [teacherId, text]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Add Note Error:", err.message);
        res.status(500).json({ success: false, error: "Note save nahi ho saka." });
    }
};

// Delete a note
export const deleteNote = async (req, res) => {
    const { id } = req.params;
    const teacherId = req.user.id;
    try {
        const result = await pool.query(
            'DELETE FROM teacher_notes WHERE id = $1 AND teacher_id = $2', 
            [id, teacherId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Note nahi mila." });
        res.json({ success: true, message: "Note deleted successfully." });
    } catch (err) {
        console.error("Delete Note Error:", err.message);
        res.status(500).json({ success: false, error: "Delete fail ho gaya." });
    }
};