import { Schema, model } from 'mongoose';
const userSchema = new Schema({
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
export default model('User', userSchema);
//# sourceMappingURL=User.js.map