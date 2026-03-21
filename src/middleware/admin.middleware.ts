import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; isAdmin: boolean };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token tələb olunur' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; isAdmin?: boolean };
    req.user = { id: decoded.id, isAdmin: !!decoded.isAdmin };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Etibarsız token' });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Yalnız admin icazəsi ilə' });
  }
  next();
};