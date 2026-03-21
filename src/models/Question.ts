import { Schema, model, Document } from 'mongoose';

export interface IQuestion extends Document {
  title: string;
  description: string;
  functionSignature: string;
  testCases: Array<{ input: any; output: any }>;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const questionSchema = new Schema<IQuestion>({
  title:            { type: String, required: true },
  description:      { type: String, required: true },
  functionSignature:{ type: String, required: true },
  testCases:        [{ input: Schema.Types.Mixed, output: Schema.Types.Mixed }],
  difficulty:       { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
});

export default model<IQuestion>('Question', questionSchema);