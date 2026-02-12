import express from 'express';
const router = express.Router();
import * as quizController from '../controllers/quizController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

// ==========================================
// 👨‍🏫 TEACHER ROUTES
// ==========================================

// Quiz create karne ke liye
router.post('/teacher/create', verifyToken, quizController.teacherCreateQuiz);

// Student ko quiz assign karne ke liye
router.post('/teacher/assign', verifyToken, quizController.assignToStudent);

// Teacher ko apne saare banaye huay quizzes dikhane ke liye
router.get('/teacher/all-quizzes', verifyToken, quizController.getAllQuizzes);

// ✅ IMPORTANT: Teacher ko students ke results dikhane ke liye (Ye missing tha)
router.get('/teacher/results/:quiz_id', verifyToken, quizController.getTeacherQuizResults);


// ==========================================
// 👨‍🎓 STUDENT ROUTES
// ==========================================

// Student ko apne assigned quizzes dikhane ke liye
router.get('/student/my-quizzes', verifyToken, quizController.getStudentQuizzes);

// Quiz attempt karte waqt questions mangwane ke liye
router.get('/questions/:assignment_id', verifyToken, quizController.getQuizQuestions);

// Quiz submit karne ke liye
router.post('/student/submit', verifyToken, quizController.submitQuiz);

// Individual result/report card dekhne ke liye
router.get('/result/:assignment_id', verifyToken, quizController.getQuizResult);

// routes/quizRoutes.js
router.get('/questions-list/:quiz_id', verifyToken, quizController.getQuizQuestionsList); // List dekhne ke liye
router.delete('/question/:id', verifyToken, quizController.deleteQuestion); // Delete karne ke liye

export default router;