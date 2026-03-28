import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllMatches,
  getAdminModules,
  getAdminBlogs
} from '../controllers/admin.controller';

const router = Router();

// User Management
router.get('/users', protect, adminOnly, getAllUsers);
router.get('/users/:id', protect, adminOnly, getUserById);
router.patch('/users/:id', protect, adminOnly, updateUser);
router.delete('/users/:id', protect, adminOnly, deleteUser);

// Match Management
router.get('/matches', protect, adminOnly, getAllMatches);

// Module Management
router.get('/modules', protect, adminOnly, getAdminModules);

// Blog Management
router.get('/blogs', protect, adminOnly, getAdminBlogs);

export default router;