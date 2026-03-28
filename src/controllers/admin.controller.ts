import { Request, Response } from 'express';
import User from '../models/User';
import Match from '../models/Match';
import Module from '../models/Module';
import Blog from '../models/Blog';
import { AuthRequest } from '../middleware/auth.middleware';

// ════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAdmin, learnedLanguages, xp } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;
    if (learnedLanguages) user.learnedLanguages = learnedLanguages;
    if (typeof xp === 'number') user.xp = xp;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════
// MATCH MANAGEMENT
// ════════════════════════════════════════════════════════

export const getAllMatches = async (req: Request, res: Response) => {
  try {
    const matches = await Match.find()
      .populate('player1Id player2Id winnerId', 'username email');
    res.json({ success: true, data: matches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════
// MODULE MANAGEMENT (Alternative to /api/modules routes)
// ════════════════════════════════════════════════════════

export const getAdminModules = async (req: Request, res: Response) => {
  try {
    const modules = await Module.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: modules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════
// BLOG MANAGEMENT
// ════════════════════════════════════════════════════════

export const getAdminBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'username email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
