import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { getAllUsers, getAllMatches, deleteUser } from '../controllers/admin.controller';
const router = Router();
router.get('/users', protect, adminOnly, getAllUsers);
router.get('/matches', protect, adminOnly, getAllMatches);
router.delete('/users/:id', protect, adminOnly, deleteUser);
export default router;
//# sourceMappingURL=admin.routes.js.map