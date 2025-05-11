import User from '../models/userModel';
import HttpError from '../models/ErrorModels';
import { Request, Response, NextFunction } from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: Types.ObjectId;
        isAdmin: boolean;
      };
    }
  }
}

// ========================= REGISTER NEW USER =========================
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fullname, email, password, password2, matricNumber, role } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!fullname) missingFields.push('fullname');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!password2) missingFields.push('password confirmation');
    
    if (missingFields.length > 0) {
      return next(new HttpError(
        `Missing required fields: ${missingFields.join(', ')}`, 
        422
      ));
    }

    if (password !== password2) {
      return next(new HttpError('Passwords do not match', 422));
    }

    if (password.length < 8) {
      return next(new HttpError('Password must be at least 8 characters', 422));
    }

    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { matricNumber }] 
    });

    if (existingUser) {
      const conflictField = existingUser.email === email.toLowerCase() 
        ? 'Email' 
        : 'Matric number';
      return next(new HttpError(`${conflictField} already exists`, 409));
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullname,
      email: email.toLowerCase(),
      password: hashedPassword,
      matricNumber: matricNumber || undefined,
      role: role || 'student'
    });

    const token = jwt.sign(
      { 
        id: newUser._id, 
        isAdmin: newUser.isAdmin 
      },
      process.env.JWT_SECRET || 'fallback_secret_development_only',
      { expiresIn: '7d' }
    );

    // Only send ONE response
    const userResponse = {
      ...newUser.toObject(),
      password: undefined // Remove password from response
    };

    res.status(201).json({
      success: true,
      data: userResponse,
      token
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return next(new HttpError(`Validation failed: ${errors.join(', ')}`, 422));
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new HttpError(
        `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 
        409
      ));
    }

    return next(new HttpError('Registration failed. Please try again.', 500));
  }
};

// ========================= LOGIN USER =========================
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { emailOrMatric, password } = req.body;

    if (!emailOrMatric || !password) {
      return next(new HttpError(
        'Both email/matric number and password are required', 
        422
      ));
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrMatric.toLowerCase() },
        { matricNumber: emailOrMatric }
      ]
    }).select('+password');

    if (!user) {
      return next(new HttpError('Invalid credentials', 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(new HttpError('Invalid credentials', 401));
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        isAdmin: user.isAdmin 
      },
      process.env.JWT_SECRET || 'fallback_secret_development_only',
      { expiresIn: '7d' }
    );

    // Only send ONE response
    const userResponse = {
      ...user.toObject(),
      password: undefined // Remove password from response
    };

    res.status(200).json({
      success: true,
      data: userResponse,
      token
    });

  } catch (error) {
    console.error('Login Error:', error);
    return next(new HttpError('Login failed. Please try again.', 500));
  }
};
// ========================= GET USER PROFILE =========================
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new HttpError('Not authenticated', 401));
    }

    const userId = req.params.id;
    
    // Verify authorization
    if (userId !== req.user.id.toString() && !req.user.isAdmin) {
      return next(new HttpError('Not authorized', 403));
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return next(new HttpError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get User Error:', error);
    return next(new HttpError('Failed to fetch user data', 500));
  }
};