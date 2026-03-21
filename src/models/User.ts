import { Schema, model, Document } from 'mongoose';

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
  isAdmin: boolean;
  createdAt: Date;
}

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
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default model<IUser>('User', userSchema);