import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { getMe, updateMe, updateCharacter, getUserById } from '../controllers/user.controller';

const router = Router();

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.put('/character', protect, updateCharacter);
router.get('/:id', protect, getUserById);

export default router;