import { Schema, model, Document } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  excerpt: string;
  content: string;
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
  comments: Array<{
    user: string;
    text: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  author: {
    _id: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true }
  },
  category: {
    type: String,
    enum: ['Web3', 'JavaScript', 'React', 'Advanced', 'Beginner'],
    default: 'Beginner'
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner'
  },
  tags: [{ type: String, trim: true }],
  reads: { type: Number, default: 0 },
  likes: [{ type: String }],
  comments: [
    {
      user: String,
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model<IBlog>('Blog', blogSchema);
