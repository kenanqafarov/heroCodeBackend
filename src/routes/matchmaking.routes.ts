import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  joinQueue,
  leaveQueue,
  getMyMatch,
  attack,
  leaveMatch,
  startGameQuestions
} from '../controllers/matchmaking.controller';

const router = Router();

router.post('/join', protect, joinQueue);
router.delete('/leave-queue', protect, leaveQueue);
router.get('/my-match', protect, getMyMatch);
router.post('/attack', protect, attack);
router.post('/leave-match', protect, leaveMatch);
router.get('/start-game-questions', protect, startGameQuestions);

export default router;