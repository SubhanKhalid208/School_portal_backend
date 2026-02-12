import express from 'express';
const router = express.Router();
import * as quizController from '../controllers/quizController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

// ==========================================
// 👨‍🏫 TEACHER ROUTES
// ==========================================

// 1. Quiz create karne ke liye
router.post('/teacher/create', verifyToken, quizController.teacherCreateQuiz);

// 2. Student ko quiz assign karne ke liye
router.post('/teacher/assign', verifyToken, quizController.assignToStudent);

// 3. Teacher ko apne saare banaye huay quizzes dikhane ke liye
router.get('/teacher/all-quizzes', verifyToken, quizController.getAllQuizzes);

// 4. Teacher ko students ke results dikhane ke liye
router.get('/teacher/results/:quiz_id', verifyToken, quizController.getTeacherQuizResults);

// 5. Quiz ke andar ke MCQs dekhne ke liye
router.get('/questions-list/:quiz_id', verifyToken, quizController.getQuizQuestionsList);

// 6. Specific MCQ delete karne ke liye
router.delete('/question/:id', verifyToken, quizController.deleteQuestion);

// 7. POORA QUIZ DELETE KARNE KE LIYE (New Added)
router.delete('/teacher/delete-quiz/:id', verifyToken, quizController.deleteQuiz);


// ==========================================
// 👨‍🎓 STUDENT ROUTES
// ==========================================

// 1. Student ko apne assigned quizzes dikhane ke liye
router.get('/student/my-quizzes', verifyToken, quizController.getStudentQuizzes);

// 2. Quiz attempt karte waqt questions mangwane ke liye
router.get('/questions/:assignment_id', verifyToken, quizController.getQuizQuestions);

// 3. Quiz submit karne ke liye
router.post('/student/submit', verifyToken, quizController.submitQuiz);

// 4. Individual result/report card dekhne ke liye
router.get('/result/:assignment_id', verifyToken, quizController.getQuizResult);

export default router;