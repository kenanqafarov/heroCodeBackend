import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import {
  createModule,
  getAllModules,
  getModuleById,
  updateModule,
  deleteModule
} from '../controllers/module.controller';

const router = Router();

// Public routes
router.get('/', getAllModules);
router.get('/:id', getModuleById);

// Admin only routes
router.post('/', protect, adminOnly, createModule);
router.put('/:id', protect, adminOnly, updateModule);
router.delete('/:id', protect, adminOnly, deleteModule);

export default router;
