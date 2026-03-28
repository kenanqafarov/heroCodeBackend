import { Router } from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  getUserBlogs,
  updateBlog,
  deleteBlog,
  likeBlog,
  addCommentOrReply,
} from '../controllers/blog.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);

// Protected routes
router.post('/', protect, createBlog);
router.get('/user/my-blogs', protect, getUserBlogs);
router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);
router.post('/:id/like', protect, likeBlog);
router.post('/:id/comment', protect, addCommentOrReply);   // həm comment, həm reply üçün

export default router;