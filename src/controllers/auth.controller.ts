import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      username,
      skillLevel,
      reason
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email və parol mütləqdir' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'Bu email artıq qeydiyyatdan keçib' });
    }

    // Username unikallığını yoxla
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ success: false, message: 'Bu istifadəçi adı artıq istifadə olunub' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      email,
      password: hashedPassword,
      username,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      skillLevel,
      reason,
      isAdmin: process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase()) || false,
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.isAdmin);

    res.status(201).json({
      success: true,
      accessToken: token,
      data: {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        skillLevel: user.skillLevel,
        isAdmin: user.isAdmin,
        character: user.character
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email və parol mütləqdir' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email və ya parol səhvdir' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email və ya parol səhvdir' });
    }

    const token = generateToken(user._id.toString(), user.isAdmin);

    res.json({
      success: true,
      accessToken: token,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        skillLevel: user.skillLevel,
        xp: user.xp,
        level: user.level,
        isAdmin: user.isAdmin,
        character: user.character
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};