// ✅ 1. Submit Quiz & Generate Result
export const submitQuiz = async (req, res) => {
    const { assignment_id, answers } = req.body; 
    const studentId = req.user.id;

    try {
        // Double submission check
        const alreadySubmitted = await pool.query(
            "SELECT id FROM quiz_results WHERE assignment_id = $1 AND student_id = $2",
            [assignment_id, studentId]
        );

        if (alreadySubmitted.rows.length > 0) {
            return res.status(400).json({ error: "Aap ye quiz pehle hi submit kar chuke hain!" });
        }

        // Fetch correct answers for comparison
        const questionsRes = await pool.query(
            `SELECT id, correct_option, marks FROM questions WHERE quiz_id = 
            (SELECT quiz_id FROM quiz_assignments WHERE id = $1)`, [assignment_id]
        );
        
        let score = 0;
        let totalMarks = 0;

        questionsRes.rows.forEach(q => {
            totalMarks += q.marks;
            const studentAns = answers.find(a => a.question_id === q.id);
            if (studentAns && studentAns.selected === q.correct_option) {
                score += q.marks;
            }
        });

        // Get passing marks threshold
        const quizInfo = await pool.query(
            "SELECT passing_marks FROM quizzes WHERE id = (SELECT quiz_id FROM quiz_assignments WHERE id = $1)", 
            [assignment_id]
        );
        
        const status = score >= quizInfo.rows[0].passing_marks ? 'PASS' : 'FAIL';

        // Save final result
        await pool.query(
            `INSERT INTO quiz_results (assignment_id, student_id, score, total_marks, status) 
             VALUES ($1, $2, $3, $4, $5)`,
            [assignment_id, studentId, score, totalMarks, status]
        );

        // Update assignment status
        await pool.query("UPDATE quiz_assignments SET is_completed = TRUE WHERE id = $1", [assignment_id]);

        res.json({ success: true, score, status, totalMarks });
    } catch (err) {
        console.error("Quiz Submission Error:", err);
        res.status(500).json({ error: "Submission fail ho gayi: " + err.message });
    }
};

// ✅ 2. Get Student's Assigned Quizzes
export const getStudentQuizzes = async (req, res) => {
    const studentId = req.user.id;

    try {
        const query = `
            SELECT 
                qa.id AS assignment_id,
                q.title,
                q.description,
                q.total_marks,
                q.passing_marks,
                u.name AS teacher_name,
                qa.is_completed,
                qa.assigned_at
            FROM quiz_assignments qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN users u ON q.created_by = u.id
            WHERE qa.student_id = $1
            ORDER BY qa.assigned_at DESC
        `;
        const result = await pool.query(query, [studentId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Quizzes fetch nahi ho sakein." });
    }
};

// ✅ 3. Get Questions for a Specific Quiz
export const getQuizQuestions = async (req, res) => {
    const { assignment_id } = req.params;
    const studentId = req.user.id;

    try {
        const assignmentCheck = await pool.query(
            "SELECT quiz_id, is_completed FROM quiz_assignments WHERE id = $1 AND student_id = $2",
            [assignment_id, studentId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ error: "Unauthorized access!" });
        }

        if (assignmentCheck.rows[0].is_completed) {
            return res.status(400).json({ error: "Quiz already completed." });
        }

        const quizId = assignmentCheck.rows[0].quiz_id;
        const questions = await pool.query(
            "SELECT id, question_text, option_a, option_b, option_c, option_d, marks FROM questions WHERE quiz_id = $1",
            [quizId]
        );

        res.json(questions.rows);
    } catch (err) {
        res.status(500).json({ error: "Questions load nahi ho sakay." });
    }
};
// ✅ 4. Specific Result Fetch karne ke liye (Report Card)
export const getQuizResult = async (req, res) => {
    const { assignment_id } = req.params;
    const studentId = req.user.id;

    try {
        const result = await pool.query(`
            SELECT 
                qr.*, 
                q.title, 
                q.passing_marks,
                u.name as teacher_name
            FROM quiz_results qr
            JOIN quiz_assignments qa ON qr.assignment_id = qa.id
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN users u ON q.created_by = u.id
            WHERE qr.assignment_id = $1 AND qr.student_id = $2
        `, [assignment_id, studentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Result record nahi mila!" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Result fetch karne mein error: " + err.message });
    }
};