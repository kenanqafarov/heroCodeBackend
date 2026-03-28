import { Schema, model, Document, Types } from 'mongoose';

export interface IComment {
  _id: Types.ObjectId;
  user: string;
  userId?: string;
  text: string;
  createdAt: Date;
  parentId?: Types.ObjectId | null;
  replies: IComment[];
}

export interface IBlog extends Document {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: {
    _id: string;
    username: string;
    email: string;
  };
  category: 'Web3' | 'JavaScript' | 'React' | 'Advanced' | 'Beginner';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  tags: string[];
  reads: number;
  likes: string[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    user: { type: String, required: true },
    userId: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    parentId: { type: Schema.Types.ObjectId, default: null },
    replies: [{ type: Schema.Types.Mixed }], // recursive nested replies
  },
  { _id: true }
);

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    coverImage: { type: String, default: '' },
    author: {
      _id: { type: String, required: true },
      username: { type: String, required: true },
      email: { type: String, required: true },
    },
    category: {
      type: String,
      enum: ['Web3', 'JavaScript', 'React', 'Advanced', 'Beginner'],
      default: 'Beginner',
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner',
    },
    tags: [{ type: String, trim: true }],
    reads: { type: Number, default: 0 },
    likes: [{ type: String }],
    comments: [commentSchema],
  },
  { timestamps: true }
);

// Full-text search index
blogSchema.index({ title: 'text', excerpt: 'text' });

export default model<IBlog>('Blog', blogSchema);