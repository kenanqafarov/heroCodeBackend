import jwt from 'jsonwebtoken';

export const generateToken = (userId: string, isAdmin: boolean = false) => {
  return jwt.sign(
    { id: userId, isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );
};