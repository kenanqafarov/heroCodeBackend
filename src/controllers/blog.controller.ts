import { Request, Response } from 'express';
import Blog from '../models/Blog';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

// ─── Create Blog ───────────────────────────────────────────────────────────────
export const createBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { title, excerpt, content, category, difficulty, tags, coverImage } = req.body;

    if (!title?.trim() || !excerpt?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'Title, excerpt and content are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const blog = await Blog.create({
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      coverImage: coverImage || '',
      category: category || 'Beginner',
      difficulty: difficulty || 'Beginner',
      tags: tags || [],
      author: {
        _id: userId,
        username: user.username || 'Unknown',
        email: user.email,
      },
    });

    res.status(201).json({ success: true, message: 'Blog created successfully', data: blog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get All Blogs ─────────────────────────────────────────────────────────────
export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const search = req.query.search as string;
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag] };

    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Blog By ID ────────────────────────────────────────────────────────────
export const getBlogById = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { reads: 1 } },
      { new: true }
    );

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    res.json({ success: true, data: blog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get User Blogs ────────────────────────────────────────────────────────────
export const getUserBlogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const blogs = await Blog.find({ 'author._id': userId }).sort({ createdAt: -1 });

    res.json({ success: true, data: blogs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Blog ───────────────────────────────────────────────────────────────
export const updateBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    if (blog.author._id !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const { title, excerpt, content, category, difficulty, tags, coverImage } = req.body;

    if (title) blog.title = title.trim();
    if (excerpt) blog.excerpt = excerpt.trim();
    if (content) blog.content = content;
    if (category) blog.category = category;
    if (difficulty) blog.difficulty = difficulty;
    if (tags) blog.tags = tags;
    if (coverImage !== undefined) blog.coverImage = coverImage;

    await blog.save();

    res.json({ success: true, message: 'Blog updated successfully', data: blog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete Blog ───────────────────────────────────────────────────────────────
export const deleteBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    if (blog.author._id !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    await blog.deleteOne();

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Like / Unlike Blog ────────────────────────────────────────────────────────
export const likeBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const idx = blog.likes.indexOf(userId);
    if (idx > -1) {
      blog.likes.splice(idx, 1);
    } else {
      blog.likes.push(userId);
    }

    await blog.save();

    res.json({
      success: true,
      message: idx > -1 ? 'Like removed' : 'Liked',
      data: { likes: blog.likes },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Add Comment or Reply (Nested) ─────────────────────────────────────────────
export const addCommentOrReply = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { text, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const user = await User.findById(userId);
    const username = user?.username || 'Anonymous';

    const newComment: any = {
      user: username,
      userId,
      text: text.trim(),
      createdAt: new Date(),
      replies: [],
    };

    if (!parentId) {
      // Əsas comment
      blog.comments.push(newComment);
    } else {
      // Reply əlavə et (recursive)
      const addReply = (comments: any[]): boolean => {
        for (const comment of comments) {
          if (comment._id.toString() === parentId) {
            comment.replies.push(newComment);
            return true;
          }
          if (comment.replies && addReply(comment.replies)) {
            return true;
          }
        }
        return false;
      };

      const added = addReply(blog.comments);
      if (!added) {
        return res.status(404).json({ success: false, message: 'Parent comment not found' });
      }
    }

    await blog.save();

    res.json({
      success: true,
      message: parentId ? 'Reply added successfully' : 'Comment added successfully',
      data: blog.comments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};