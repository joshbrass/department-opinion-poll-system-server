"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteOption = exports.removeOption = exports.getOption = exports.addOption = void 0;
const ErrorModels_1 = __importDefault(require("../models/ErrorModels"));
const pollModel_1 = __importDefault(require("../models/pollModel"));
const optionModel_1 = __importDefault(require("../models/optionModel"));
// ========================= ADD OPTION
// POST : api/options
// PROTECTED (only admin)
const addOption = async (req, res, next) => {
    try {
        // Authorization check
        if (!req.user?.isAdmin) {
            return next(new ErrorModels_1.default("Only admins can perform this action", 403));
        }
        // Validate required fields
        const { answer, pollId } = req.body;
        if (!answer || !pollId) {
            return next(new ErrorModels_1.default("Please provide both answer and pollId", 422));
        }
        // Verify poll exists
        const poll = await pollModel_1.default.findById(pollId);
        if (!poll) {
            return next(new ErrorModels_1.default("Poll not found", 404));
        }
        // Prevent adding options to expired polls
        if (new Date() > new Date(poll.endDate)) {
            return next(new ErrorModels_1.default("Cannot add options to expired polls", 400));
        }
        // Create new option
        const newOption = await optionModel_1.default.create({
            answer,
            poll: pollId,
            voteCount: 0,
            votedBy: []
        });
        // Add option to poll's options array
        poll.options.push(newOption._id);
        await poll.save();
        res.status(201).json({
            success: true,
            data: newOption
        });
    }
    catch (error) {
        console.error("Add option error:", error);
        return next(new ErrorModels_1.default(error instanceof Error ? error.message : "Failed to add option", 500));
    }
};
exports.addOption = addOption;
// ========================= GET OPTION
// GET : api/options/:id
// PROTECTED 
const getOption = async (req, res, next) => {
    try {
        const option = await optionModel_1.default.findById(req.params.id)
            .populate('poll', 'title')
            .populate('votedBy', 'name email');
        if (!option) {
            return next(new ErrorModels_1.default("Option not found", 404));
        }
        res.status(200).json({
            success: true,
            data: option
        });
    }
    catch (error) {
        console.error("Get option error:", error);
        return next(new ErrorModels_1.default(error instanceof Error ? error.message : "Failed to get option", 500));
    }
};
exports.getOption = getOption;
// ========================= DELETE OPTION
// DELETE : api/options/:id
// PROTECTED (only admin)
const removeOption = async (req, res, next) => {
    try {
        // Authorization check
        if (!req.user?.isAdmin) {
            return next(new ErrorModels_1.default("Only admins can perform this action", 403));
        }
        const option = await optionModel_1.default.findById(req.params.id);
        if (!option) {
            return next(new ErrorModels_1.default("Option not found", 404));
        }
        // Remove option from poll's options array
        await pollModel_1.default.findByIdAndUpdate(option.poll, { $pull: { options: option._id } });
        // Delete the option
        await optionModel_1.default.findByIdAndDelete(req.params.id);
        res.status(200).json({
            success: true,
            message: "Option deleted successfully"
        });
    }
    catch (error) {
        console.error("Delete option error:", error);
        return next(new ErrorModels_1.default(error instanceof Error ? error.message : "Failed to delete option", 500));
    }
};
exports.removeOption = removeOption;
// ========================= VOTE OPTION
// PATCH : api/options/:id
// PROTECTED 
const voteOption = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorModels_1.default("User not authenticated", 401));
        }
        const option = await optionModel_1.default.findById(req.params.id).populate('poll');
        if (!option) {
            return next(new ErrorModels_1.default("Option not found", 404));
        }
        const poll = option.poll;
        // Check if poll is active
        const now = new Date();
        if (now < new Date(poll.startDate) || now > new Date(poll.endDate)) {
            return next(new ErrorModels_1.default("Voting is only allowed during the poll period", 400));
        }
        // Check if user already voted in this poll
        const existingVote = await optionModel_1.default.findOne({
            poll: poll._id,
            votedBy: userId
        });
        if (existingVote) {
            return next(new ErrorModels_1.default("You have already voted in this poll", 400));
        }
        // Update the option with new vote
        const updatedOption = await optionModel_1.default.findByIdAndUpdate(req.params.id, {
            $inc: { voteCount: 1 },
            $push: { votedBy: userId }
        }, { new: true });
        // Add user to poll's votedUsers array
        await pollModel_1.default.findByIdAndUpdate(poll._id, { $addToSet: { votedUsers: userId } });
        res.status(200).json({
            success: true,
            data: updatedOption
        });
    }
    catch (error) {
        console.error("Vote option error:", error);
        return next(new ErrorModels_1.default(error instanceof Error ? error.message : "Failed to process vote", 500));
    }
};
exports.voteOption = voteOption;
