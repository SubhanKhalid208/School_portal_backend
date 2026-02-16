import pool from '../config/db.js';

// ✅ Helper: determine which column stores assignment reference
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

// 1. Teacher: Create a New Quiz
export const teacherCreateQuiz = async (req, res) => {
    const { title, description, passing_marks, questions } = req.body;
    const teacherId = req.user.id;
    try {
        const totalMarks = questions.reduce((sum, q) => sum + parseInt(q.marks), 0);
        const quizRes = await pool.query(
            "INSERT INTO quizzes (title, description, total_marks, passing_marks, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [title, description, totalMarks, passing_marks, teacherId]
        );
        const quizId = quizRes.rows[0].id;
        for (const q of questions) {
            await pool.query(
                "INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [quizId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks]
            );
        }
        res.json({ success: true, message: "Quiz successfully created!", quizId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Teacher: Assign Quiz to Student
export const assignToStudent = async (req, res) => {
    const { quiz_id, student_id } = req.body;
    try {
        await pool.query(
            "INSERT INTO quiz_assignments (quiz_id, student_id) VALUES ($1, $2)",
            [quiz_id, student_id]
        );
        res.json({ success: true, message: "Quiz assigned successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Student: Submit Quiz
export const submitQuiz = async (req, res) => {
    const { assignment_id, answers } = req.body; 
    const studentId = req.user.id;
    try {
        const col = await getAssignmentColumn();
        const alreadySubmitted = await pool.query(
            `SELECT id FROM quiz_results WHERE ${col} = $1 AND student_id = $2`,
            [assignment_id, studentId]
        );
        if (alreadySubmitted.rows.length > 0) {
            return res.status(400).json({ error: "Aap ye quiz pehle hi submit kar chuke hain!" });
        }
        const questionsRes = await pool.query(
            `SELECT id, correct_option, marks FROM questions WHERE quiz_id = 
            (SELECT quiz_id FROM quiz_assignments WHERE id = $1)`, [assignment_id]
        );
        let score = 0;
        let totalMarks = 0;
        questionsRes.rows.forEach(q => {
            totalMarks += parseInt(q.marks);
            const studentAns = answers.find(a => parseInt(a.question_id) === parseInt(q.id));
            if (studentAns && studentAns.selected.trim().toUpperCase() === q.correct_option.trim().toUpperCase()) {
                score += parseInt(q.marks);
            }
        });
        const quizInfo = await pool.query(
            "SELECT passing_marks FROM quizzes WHERE id = (SELECT quiz_id FROM quiz_assignments WHERE id = $1)", 
            [assignment_id]
        );
        const passingMarks = quizInfo.rows[0]?.passing_marks || 0;
        const status = score >= passingMarks ? 'PASS' : 'FAIL';
        const insertSQL = `INSERT INTO quiz_results (${col}, student_id, score, total_marks, status) VALUES ($1, $2, $3, $4, $5)`;
        await pool.query(insertSQL, [assignment_id, studentId, score, totalMarks, status]);
        await pool.query("UPDATE quiz_assignments SET is_completed = TRUE WHERE id = $1", [assignment_id]);
        res.json({ success: true, score, status, totalMarks });
    } catch (err) {
        res.status(500).json({ error: "Submission fail: " + err.message });
    }
};

// 4. Student: Get My Quizzes
export const getStudentQuizzes = async (req, res) => {
    const studentId = req.user.id;
    try {
        const col = await getAssignmentColumn();
        const query = `
            SELECT qa.id AS assignment_id, q.title, q.description, q.total_marks, u.name AS teacher_name, 
                   qa.is_completed, qa.assigned_at, qr.score, qr.status
            FROM quiz_assignments qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN users u ON q.created_by = u.id
            LEFT JOIN quiz_results qr ON qa.id = qr.${col} AND qr.student_id = $1
            WHERE qa.student_id = $1 
            ORDER BY qa.assigned_at DESC`;
        const result = await pool.query(query, [studentId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Student: Get Questions
export const getQuizQuestions = async (req, res) => {
    const { assignment_id } = req.params;
    const studentId = req.user.id;
    try {
        const assignmentCheck = await pool.query(
            "SELECT quiz_id, is_completed FROM quiz_assignments WHERE id = $1 AND student_id = $2",
            [assignment_id, studentId]
        );
        if (assignmentCheck.rows.length === 0 || assignmentCheck.rows[0].is_completed) {
            return res.status(403).json({ error: "Unauthorized or already completed!" });
        }
        const questions = await pool.query(
            "SELECT id, question_text, option_a, option_b, option_c, option_d, marks FROM questions WHERE quiz_id = $1",
            [assignmentCheck.rows[0].quiz_id]
        );
        res.json(questions.rows);
    } catch (err) {
        res.status(500).json({ error: "Questions load nahi ho sakay." });
    }
};

// 6. Report Card
export const getQuizResult = async (req, res) => {
    const { assignment_id } = req.params;
    const studentId = req.user.id;
    try {
        const col = await getAssignmentColumn();
        const result = await pool.query(`
            SELECT qr.*, q.title, q.passing_marks, u.name as teacher_name
            FROM quiz_results qr
            JOIN quiz_assignments qa ON qr.${col} = qa.id
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN users u ON q.created_by = u.id
            WHERE qr.${col} = $1 AND qr.student_id = $2
        `, [assignment_id, studentId]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. Teacher: Get All Quizzes
export const getAllQuizzes = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, title, total_marks FROM quizzes WHERE created_by = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 8. Teacher: Get Results
export const getTeacherQuizResults = async (req, res) => {
    const { quiz_id } = req.params;
    const teacherId = req.user.id;
    try {
        const col = await getAssignmentColumn();
        const query = `
            SELECT u.name as student_name, u.email as student_email, qr.score, qr.total_marks, qr.status, qr.submitted_at
            FROM quiz_results qr
            JOIN quiz_assignments qa ON qr.${col} = qa.id
            JOIN users u ON qr.student_id = u.id
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE q.id = $1 AND q.created_by = $2
            ORDER BY qr.submitted_at DESC`;
        const result = await pool.query(query, [quiz_id, teacherId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 9. Teacher: View MCQ List
export const getQuizQuestionsList = async (req, res) => {
    try {
        const { quiz_id } = req.params;
        const result = await pool.query(
            "SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option, marks FROM questions WHERE quiz_id = $1 ORDER BY id ASC",
            [quiz_id]
        );
        const formattedQuestions = result.rows.map(q => ({
            ...q,
            options: JSON.stringify([q.option_a, q.option_b, q.option_c, q.option_d]),
            correct_answer: q.correct_option
        }));
        res.json(formattedQuestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 10. Teacher: Delete Single MCQ
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM questions WHERE id = $1", [id]);
        res.json({ success: true, message: "Question deleted!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 11. Teacher: Delete Entire Quiz
export const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;
        const check = await pool.query("SELECT id FROM quizzes WHERE id = $1 AND created_by = $2", [id, teacherId]);
        if (check.rows.length === 0) return res.status(403).json({ error: "Unauthorized" });
        const col = await getAssignmentColumn();
        await pool.query(`DELETE FROM quiz_results WHERE ${col} IN (SELECT id FROM quiz_assignments WHERE quiz_id = $1)`, [id]);
        await pool.query("DELETE FROM quiz_assignments WHERE quiz_id = $1", [id]);
        await pool.query("DELETE FROM questions WHERE quiz_id = $1", [id]);
        await pool.query("DELETE FROM quizzes WHERE id = $1", [id]);
        res.json({ success: true, message: "Quiz deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 12. Student Dashboard Analytics (STRICT NEON FIX)
// Function #12: FINAL HARD FIX
export const getStudentAnalytics = async (req, res) => {
    const studentId = req.params.id || req.user.id;
    try {
        // Muhammad Ahmed, maine yahan direct column names likh diye hain
        const query = `
            SELECT 
                q.title as label, 
                qr.score as value
            FROM quiz_results qr
            INNER JOIN quiz_assignments qa ON qr.assignment_id = qa.id
            INNER JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qr.student_id = $1
            ORDER BY qr.created_at ASC 
            LIMIT 10`;

        const quizTrends = await pool.query(query, [studentId]);
        res.json({
            success: true,
            data: { quizTrends: quizTrends.rows, attendanceTrends: [] }
        });
    } catch (err) {
        console.error("DASHBOARD ERROR:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};