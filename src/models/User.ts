import { Schema, model, Document } from 'mongoose';

// Gamified Learning System Types
export interface KnowledgeProfile {
  knownTopics: string[];
  weakTopics: string[];
  lastQuizScore: number;
  adaptationData: {
    preferredPace?: 'slow' | 'medium' | 'fast';
    learningStyle?: 'visual' | 'textual' | 'interactive';
    difficultyMultiplier?: number;
    mistakesCount?: number;
  };
}

export interface ModuleProgress {
  currentUnit: number;
  unitsCompleted: number[];
  totalXP: number;
  stars: { [level: number]: number };
  timeSpent: number; // in milliseconds
  completedAt?: Date;
}

export interface LearnedLanguage {
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface IUser extends Document {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  reason?: string;
  xp: number;
  level: number;
  character: {
    gender: 'male' | 'female';
    emotion: string;
    clothing: string;
    hairColor: string;
    skin: string;
    clothingColor: string;
    username?: string;
  };
  // New Gamified Learning Fields
  knowledgeProfile: { [moduleKey: string]: KnowledgeProfile };
  moduleProgress: { [moduleId: string]: ModuleProgress };
  unlockedModules: string[];
  totalLessonXP: number;
  learnedLanguages: LearnedLanguage[];
  isAdmin: boolean;
  createdAt: Date;
}

const knowledgeProfileSchema = new Schema({
  knownTopics: [String],
  weakTopics: [String],
  lastQuizScore: { type: Number, default: 0 },
  adaptationData: {
    preferredPace: { type: String, enum: ['slow', 'medium', 'fast'], default: 'medium' },
    learningStyle: { type: String, enum: ['visual', 'textual', 'interactive'], default: 'interactive' },
    difficultyMultiplier: { type: Number, default: 1 },
    mistakesCount: { type: Number, default: 0 }
  }
}, { _id: false });

const moduleProgressSchema = new Schema({
  currentUnit: { type: Number, default: 0 },
  unitsCompleted: [Number],
  totalXP: { type: Number, default: 0 },
  stars: { type: Map, of: Number, default: new Map() },
  timeSpent: { type: Number, default: 0 },
  completedAt: Date
}, { _id: false });

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  dateOfBirth: Date,
  skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
  reason: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  character: {
    gender: { type: String, enum: ['male', 'female'], default: 'male' },
    emotion: { type: String, default: 'neutral' },
    clothing: { type: String, default: 'tshirt' },
    hairColor: { type: String, default: '#b96321' },
    skin: { type: String, default: '#ffdbac' },
    clothingColor: { type: String, default: '#3b82f6' },
    username: String
  },
  // Gamified Learning System Fields
  knowledgeProfile: { type: Map, of: knowledgeProfileSchema, default: new Map() },
  moduleProgress: { type: Map, of: moduleProgressSchema, default: new Map() },
  unlockedModules: { type: [String], default: ['javascript-basics', 'web-development'] },
  totalLessonXP: { type: Number, default: 0 },
  learnedLanguages: [{
    language: { type: String, required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' }
  }],
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default model<IUser>('User', userSchema);