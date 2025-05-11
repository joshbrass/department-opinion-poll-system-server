"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    fullname: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                // Simple but effective email regex
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    matricNumber: {
        type: String,
        unique: true, // Field-level unique index (KEEP THIS)
        sparse: true,
        trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        required: true,
        enum: ['student', 'lecturer'],
        default: 'student',
    },
    votedPolls: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Poll' }],
    isAdmin: {
        type: Boolean,
        default: function () {
            return this.role === 'lecturer';
        },
    },
}, { timestamps: true });
// Remove these duplicate index declarations:
// userSchema.index({ email: 1 }, { unique: true });          // DELETE THIS
// userSchema.index({ matricNumber: 1 }, { unique: true, sparse: true }); // DELETE THIS
// Keep this middleware
userSchema.pre('save', function (next) {
    this.isAdmin = this.role === 'lecturer';
    next();
});
const User = (0, mongoose_1.model)('User', userSchema);
exports.default = User;
