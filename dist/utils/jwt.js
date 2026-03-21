import jwt from 'jsonwebtoken';
export const generateToken = (userId, isAdmin = false) => {
    return jwt.sign({ id: userId, isAdmin }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};
//# sourceMappingURL=jwt.js.map