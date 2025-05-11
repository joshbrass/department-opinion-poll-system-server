"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.loginUser = exports.registerUser = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const ErrorModels_1 = __importDefault(require("../models/ErrorModels"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ========================= REGISTER NEW USER =========================
const registerUser = async (req, res, next) => {
    try {
        const { fullname, email, password, password2, matricNumber, role } = req.body;
        // Validate required fields
        const missingFields = [];
        if (!fullname)
            missingFields.push('fullname');
        if (!email)
            missingFields.push('email');
        if (!password)
            missingFields.push('password');
        if (!password2)
            missingFields.push('password confirmation');
        if (missingFields.length > 0) {
            return next(new ErrorModels_1.default(`Missing required fields: ${missingFields.join(', ')}`, 422));
        }
        if (password !== password2) {
            return next(new ErrorModels_1.default('Passwords do not match', 422));
        }
        if (password.length < 8) {
            return next(new ErrorModels_1.default('Password must be at least 8 characters', 422));
        }
        const existingUser = await userModel_1.default.findOne({
            $or: [{ email: email.toLowerCase() }, { matricNumber }]
        });
        if (existingUser) {
            const conflictField = existingUser.email === email.toLowerCase()
                ? 'Email'
                : 'Matric number';
            return next(new ErrorModels_1.default(`${conflictField} already exists`, 409));
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const newUser = await userModel_1.default.create({
            fullname,
            email: email.toLowerCase(),
            password: hashedPassword,
            matricNumber: matricNumber || undefined,
            role: role || 'student'
        });
        const token = jsonwebtoken_1.default.sign({
            id: newUser._id,
            isAdmin: newUser.isAdmin
        }, process.env.JWT_SECRET || 'fallback_secret_development_only', { expiresIn: '7d' });
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
    }
    catch (error) {
        console.error('Registration Error:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err) => err.message);
            return next(new ErrorModels_1.default(`Validation failed: ${errors.join(', ')}`, 422));
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return next(new ErrorModels_1.default(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 409));
        }
        return next(new ErrorModels_1.default('Registration failed. Please try again.', 500));
    }
};
exports.registerUser = registerUser;
// ========================= LOGIN USER =========================
const loginUser = async (req, res, next) => {
    try {
        const { emailOrMatric, password } = req.body;
        if (!emailOrMatric || !password) {
            return next(new ErrorModels_1.default('Both email/matric number and password are required', 422));
        }
        const user = await userModel_1.default.findOne({
            $or: [
                { email: emailOrMatric.toLowerCase() },
                { matricNumber: emailOrMatric }
            ]
        }).select('+password');
        if (!user) {
            return next(new ErrorModels_1.default('Invalid credentials', 401));
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return next(new ErrorModels_1.default('Invalid credentials', 401));
        }
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            isAdmin: user.isAdmin
        }, process.env.JWT_SECRET || 'fallback_secret_development_only', { expiresIn: '7d' });
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
    }
    catch (error) {
        console.error('Login Error:', error);
        return next(new ErrorModels_1.default('Login failed. Please try again.', 500));
    }
};
exports.loginUser = loginUser;
// ========================= GET USER PROFILE =========================
const getUser = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new ErrorModels_1.default('Not authenticated', 401));
        }
        const userId = req.params.id;
        // Verify authorization
        if (userId !== req.user.id.toString() && !req.user.isAdmin) {
            return next(new ErrorModels_1.default('Not authorized', 403));
        }
        const user = await userModel_1.default.findById(userId).select('-password');
        if (!user) {
            return next(new ErrorModels_1.default('User not found', 404));
        }
        res.status(200).json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Get User Error:', error);
        return next(new ErrorModels_1.default('Failed to fetch user data', 500));
    }
};
exports.getUser = getUser;
