import { Schema, model } from 'mongoose';
const matchSchema = new Schema({
    player1Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    player2Id: { type: Schema.Types.ObjectId, ref: 'User' },
    player1Health: { type: Number, default: 100 },
    player2Health: { type: Number, default: 100 },
    status: { type: String, enum: ['Waiting', 'Active', 'Finished'], default: 'Waiting' },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    questions: [{ type: String }],
    currentQuestionIndex: { type: Number, default: 0 }
});
export default model('Match', matchSchema);
//# sourceMappingURL=Match.js.map