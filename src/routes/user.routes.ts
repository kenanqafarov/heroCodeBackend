import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { getMe, updateCharacter, getUserById } from '../controllers/user.controller';

const router = Router();

router.get('/me', protect, getMe);
router.put('/character', protect, updateCharacter);
router.get('/:id', protect, getUserById);

export default router;