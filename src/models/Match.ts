import { Schema, model, Document, Types } from 'mongoose';

export interface IMatch extends Document {
  player1Id: Types.ObjectId;
  player2Id?: Types.ObjectId;
  player1Health: number;
  player2Health: number;
  status: 'Waiting' | 'Active' | 'Finished';
  winnerId?: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  questions: string[];               // sual ID-ləri (string olaraq saxlanılır)
  currentQuestionIndex: number;
}

const matchSchema = new Schema<IMatch>({
  player1Id:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  player2Id:        { type: Schema.Types.ObjectId, ref: 'User' },
  player1Health:    { type: Number, default: 100 },
  player2Health:    { type: Number, default: 100 },
  status:           { type: String, enum: ['Waiting', 'Active', 'Finished'], default: 'Waiting' },
  winnerId:         { type: Schema.Types.ObjectId, ref: 'User' },
  startedAt:        { type: Date, default: Date.now },
  endedAt:          Date,
  questions:        [{ type: String }],
  currentQuestionIndex: { type: Number, default: 0 }
});

export default model<IMatch>('Match', matchSchema);