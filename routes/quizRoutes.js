import express from 'express';
const router = express.Router();
import * as quizController from '../controllers/quizController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

// Teacher Routes
router.post('/teacher/create', verifyToken, quizController.teacherCreateQuiz);
router.post('/teacher/assign', verifyToken, quizController.assignToStudent);

// Student Routes
router.get('/student/my-quizzes', verifyToken, quizController.getStudentQuizzes);
router.get('/questions/:assignment_id', verifyToken, quizController.getQuizQuestions); // Ye bhi zaroori hai
router.post('/student/submit', verifyToken, quizController.submitQuiz);
router.get('/result/:assignment_id', verifyToken, quizController.getQuizResult); // Result/Report card ke liye

export default router;