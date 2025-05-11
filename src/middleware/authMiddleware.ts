import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import HttpError from '../models/ErrorModels';
import { Types } from 'mongoose';

interface JwtPayload {
  id: string;
  isAdmin: boolean;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Not authenticated');
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret_development_only'
    ) as JwtPayload;

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    req.user = {
      id: new Types.ObjectId(user._id), // Convert to ObjectId
      isAdmin: user.isAdmin
    };

    next();
  } catch (error) {
    return next(new HttpError('Not authenticated', 401));
  }
};

export const admin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    return next(new HttpError('Only admins can perform this action', 403));
  }
  next();
};