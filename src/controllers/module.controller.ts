import { Request, Response } from 'express';
import Module from '../models/Module';
import { AuthRequest } from '../middleware/auth.middleware';

// Admin: Create a new module
export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    const { title, language, difficulty, description, content, tags, questions } = req.body;

    if (!title || !language || !description || !content) {
      return res.status(400).json({ success: false, message: 'Title, language, description, and content are required' });
    }

    const module = new Module({
      title,
      language,
      difficulty: difficulty || 'beginner',
      description,
      content,
      tags: tags || [],
      questions: questions || [],
      createdBy: req.user!.id
    });

    await module.save();

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: module
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all modules (public, with optional filters)
export const getAllModules = async (req: Request, res: Response) => {
  try {
    const { language, difficulty } = req.query;
    let filter: any = {};

    if (language) filter.language = language;
    if (difficulty) filter.difficulty = difficulty;

    const modules = await Module.find(filter)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: modules
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get a single module by ID
export const getModuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const module = await Module.findById(id)
      .populate('createdBy', 'username email');

    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    res.json({
      success: true,
      data: module
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: Update a module
export const updateModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, language, difficulty, description, content, tags, questions } = req.body;

    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Only the creator (admin) can update
    if (module.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this module' });
    }

    if (title) module.title = title;
    if (language) module.language = language;
    if (difficulty) module.difficulty = difficulty;
    if (description) module.description = description;
    if (content) module.content = content;
    if (tags) module.tags = tags;
    if (questions) module.questions = questions;

    await module.save();

    res.json({
      success: true,
      message: 'Module updated successfully',
      data: module
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: Delete a module
export const deleteModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Only the creator (admin) can delete
    if (module.createdBy.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this module' });
    }

    await Module.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
