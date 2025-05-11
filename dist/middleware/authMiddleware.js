"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importDefault(require("../models/userModel"));
const ErrorModels_1 = __importDefault(require("../models/ErrorModels"));
const mongoose_1 = require("mongoose");
const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new Error('Not authenticated');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback_secret_development_only');
        const user = await userModel_1.default.findById(decoded.id).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        req.user = {
            id: new mongoose_1.Types.ObjectId(user._id), // Convert to ObjectId
            isAdmin: user.isAdmin
        };
        next();
    }
    catch (error) {
        return next(new ErrorModels_1.default('Not authenticated', 401));
    }
};
exports.protect = protect;
const admin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return next(new ErrorModels_1.default('Only admins can perform this action', 403));
    }
    next();
};
exports.admin = admin;
