import { Schema, model } from 'mongoose';
const questionSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    functionSignature: { type: String, required: true },
    testCases: [{ input: Schema.Types.Mixed, output: Schema.Types.Mixed }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
});
export default model('Question', questionSchema);
//# sourceMappingURL=Question.js.map