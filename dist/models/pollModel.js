"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const pollSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: {
        data: Buffer,
        contentType: String
    },
    options: [{
            type: mongoose_1.Schema.Types.ObjectId,
            required: true,
            ref: "Option"
        }],
    votedUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
            default: [] // Initialize as empty array
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isResultVisible: { type: Boolean, default: false },
}, { timestamps: true });
// Indexes for performance
pollSchema.index({ createdBy: 1 }); // Faster lookup for polls by creator
pollSchema.index({ startDate: 1, endDate: 1 }); // For querying active polls
const Poll = (0, mongoose_1.model)('Poll', pollSchema);
exports.default = Poll;
