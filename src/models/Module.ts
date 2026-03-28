import { Schema, model, Document } from 'mongoose';

export interface IModule extends Document {
  title: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  content: string; // Rich text or markdown
  tags: string[];
  questions?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
  createdBy: Schema.Types.ObjectId; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<IModule>(
  {
    title: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true }, // JavaScript, Python, Rust, Go, etc.
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    description: { type: String, required: true, trim: true },
    content: { type: String, required: true }, // HTML or Markdown content
    tags: [{ type: String, trim: true }],
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        explanation: { type: String, default: '' }
      }
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

export default model<IModule>('Module', moduleSchema);
