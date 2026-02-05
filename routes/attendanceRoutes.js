import express from 'express';
import pool from '../config/db.js';

const router = express.Router();


router.get('/check-status', async (req, res) => {
  const { date, courseId } = req.query;
  if (!date || !courseId) return res.status(400).json({ error: "Date and courseId required" });

  try {
    const result = await pool.query(
      "SELECT student_id FROM attendance WHERE date = $1 AND course_id = $2",
      [date, courseId]
    );
    const markedIds = result.rows.map(row => row.student_id);
    res.json(markedIds);
  } catch (err) {
    console.error("Check Status Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/mark', async (req, res) => {
  const { studentId, courseId, status, date, teacherId } = req.body; 
  const attendanceDate = date || new Date().toISOString().split('T')[0];

  try {
    const existing = await pool.query(
      "SELECT id FROM attendance WHERE student_id = $1 AND course_id = $2 AND date = $3",
      [studentId, courseId, attendanceDate]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE attendance SET status = $1 WHERE id = $2",
        [status, existing.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO attendance (student_id, course_id, status, date, teacher_id) VALUES ($1, $2, $3, $4, $5)",
        [studentId, courseId, status, attendanceDate, teacherId]
      );
    }
    res.json({ success: true, message: "Attendance saved successfully!" });
  } catch (err) {
    console.error("Attendance Mark Error:", err.message);
    res.status(500).json({ success: false, error: "Database error." });
  }
});

router.get('/today', async (req, res) => {
  const { date, courseId } = req.query; 
  try {
    const result = await pool.query(
      "SELECT student_id, status FROM attendance WHERE date = $1 AND course_id = $2",
      [date, courseId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const queryText = `
      SELECT a.id, a.status, TO_CHAR(a.date, 'DD-Mon-YYYY') as attendance_date,
      COALESCE(c.title, c.name, 'Unknown Subject') as subject_name 
      FROM attendance a LEFT JOIN courses c ON a.course_id = c.id 
      WHERE a.student_id = $1 ORDER BY a.date DESC`;
    const historyRes = await pool.query(queryText, [parseInt(id)]);
    const history = historyRes.rows;
    if (history.length === 0) {
      return res.json({ success: true, stats: { totalDays: 0, presentDays: 0, percentage: "0%" }, history: [] });
    }
    const totalDays = history.length;
    const presentDays = history.filter(r => r.status?.toLowerCase() === 'present').length;
    const percentage = ((presentDays / totalDays) * 100).toFixed(1);
    res.json({ success: true, stats: { totalDays, presentDays, percentage: `${percentage}%` }, history });
  } catch (err) {
    res.status(500).json({ success: false, error: "History load nahi ho saki." });
  }
});

export default router;