import { Request, Response } from 'express';
import Blog from '../models/Blog';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

// Create Blog
export const createBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { title, excerpt, content, category, difficulty, tags } = req.body;

    if (!title || !excerpt || !content) {
      return res.status(400).json({ success: false, message: 'Title, excerpt və content mütləqdir' });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const blog = new Blog({
      title,
      excerpt,
      content,
      category: category || 'Beginner',
      difficulty: difficulty || 'Beginner',
      tags: tags || [],
      author: {
        _id: userId,
        username: user.username || 'Unknown',
        email: user.email
      }
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog uğurla yaradıldı',
      data: blog
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Blogs
export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments();

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Blog By ID
export const getBlogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { reads: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog tapılmadı' });
    }

    res.json({ success: true, data: blog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User's Blogs
export const getUserBlogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const blogs = await Blog.find({ 'author._id': userId }).sort({ createdAt: -1 });

    res.json({ success: true, data: blogs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Blog
export const updateBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, excerpt, content, category, difficulty, tags } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog tapılmadı' });
    }

    // Check if user is the author
    if (blog.author._id !== userId) {
      return res.status(403).json({ success: false, message: 'Yalnız öz bloqunuzu dəyişə bilərsiniz' });
    }

    blog.title = title || blog.title;
    blog.excerpt = excerpt || blog.excerpt;
    blog.content = content || blog.content;
    blog.category = category || blog.category;
    blog.difficulty = difficulty || blog.difficulty;
    blog.tags = tags || blog.tags;
    blog.updatedAt = new Date();

    await blog.save();

    res.json({
      success: true,
      message: 'Blog uğurla yeniləndi',
      data: blog
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Blog
export const deleteBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog tapılmadı' });
    }

    // Check if user is the author
    if (blog.author._id !== userId) {
      return res.status(403).json({ success: false, message: 'Yalnız öz bloqunuzu silə bilərsiniz' });
    }

    await Blog.deleteOne({ _id: id });

    res.json({ success: true, message: 'Blog uğurla silindi' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like Blog
export const likeBlog = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog tapılmadı' });
    }

    const likeIndex = blog.likes.indexOf(userId);
    if (likeIndex > -1) {
      blog.likes.splice(likeIndex, 1);
    } else {
      blog.likes.push(userId);
    }

    await blog.save();

    res.json({
      success: true,
      message: likeIndex > -1 ? 'Like ləğv edildi' : 'Bəyənildi',
      data: blog
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Comment
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { text } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!text) {
      return res.status(400).json({ success: false, message: 'Şərh mətni mütləqdir' });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog tapılmadı' });
    }

    const user = await User.findById(userId);
    blog.comments.push({
      user: user?.username || 'Anonymous',
      text,
      createdAt: new Date()
    });

    await blog.save();

    res.json({
      success: true,
      message: 'Şərh əlavə edildi',
      data: blog
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
