import express from 'express';
const router = express.Router();
import * as quizController from '../controllers/quizController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

router.post('/teacher/create', verifyToken, quizController.teacherCreateQuiz);
router.post('/teacher/assign', verifyToken, quizController.assignToStudent);
router.post('/student/submit', verifyToken, quizController.submitQuiz);
router.get('/student/my-quizzes', verifyToken, quizController.getStudentQuizzes); // Ye function add karna hoga

export default router;