import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  getLessonModules,
  startModule,
  submitPreQuiz,
  submitUnitQuiz,
  submitBattleResult
} from '../controllers/lesson.controller';

const router = Router();

/**
 * Lesson Modules Routes
 * All routes require authentication
 */

// Get all modules and user progress
router.get('/', protect, getLessonModules);

// Start a module - generate pre-quiz
router.post('/:moduleId/start', protect, startModule);

// Submit pre-quiz and get personalized module
router.post('/:moduleId/pre-quiz-submit', protect, submitPreQuiz);

// Submit unit quiz and advance
router.post('/:moduleId/unit/:unitId/quiz-submit', protect, submitUnitQuiz);

// Submit battle result
router.post('/:moduleId/battle/result', protect, submitBattleResult);

export default router;
