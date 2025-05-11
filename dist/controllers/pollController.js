"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePoll = exports.removePoll = exports.getPollUsers = exports.getOptionOfPoll = exports.getPoll = exports.getActivePolls = exports.getPolls = exports.addPoll = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const ErrorModels_1 = __importDefault(require("../models/ErrorModels"));
const pollModel_1 = __importDefault(require("../models/pollModel"));
const optionModel_1 = __importDefault(require("../models/optionModel"));
/**
 * @desc    Create a new poll
 * @route   POST /api/polls
 * @access  Private/Admin
 */
const addPoll = async (req, res, next) => {
    // Validate admin privileges
    if (!req.user?.isAdmin) {
        next(new ErrorModels_1.default("Only admins can create polls", 403));
        return;
    }
    // Destructure and validate required fields
    const { title, description, startDate, endDate } = req.body;
    const missingFields = [];
    if (!title)
        missingFields.push('title');
    if (!description)
        missingFields.push('description');
    if (!startDate)
        missingFields.push('startDate');
    if (!endDate)
        missingFields.push('endDate');
    if (missingFields.length > 0) {
        next(new ErrorModels_1.default(`Missing required fields: ${missingFields.join(', ')}`, 422));
        return;
    }
    // Date validation
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        next(new ErrorModels_1.default("Invalid date format. Please use ISO format (YYYY-MM-DDTHH:MM:SSZ)", 422));
        return;
    }
    if (parsedStartDate >= parsedEndDate) {
        next(new ErrorModels_1.default("End date must be after start date", 422));
        return;
    }
    // File upload validation
    if (!req.files?.thumbnail) {
        next(new ErrorModels_1.default("Please upload a thumbnail image", 422));
        return;
    }
    const thumbnail = req.files.thumbnail;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxFileSize = 2 * 1024 * 1024; // 2MB
    if (!allowedTypes.includes(thumbnail.mimetype)) {
        next(new ErrorModels_1.default("Only JPEG, PNG, or WebP images are allowed", 422));
        return;
    }
    if (thumbnail.size > maxFileSize) {
        next(new ErrorModels_1.default(`Image size must be less than ${maxFileSize / (1024 * 1024)}MB`, 422));
        return;
    }
    try {
        // Process image file
        let imageBuffer;
        let tempFilePath;
        try {
            // Try to use in-memory buffer first
            if (thumbnail.data && thumbnail.data.length > 0) {
                imageBuffer = thumbnail.data;
            }
            // Fallback to temp file if buffer is empty
            else if (thumbnail.tempFilePath) {
                tempFilePath = thumbnail.tempFilePath;
                imageBuffer = await promises_1.default.readFile(tempFilePath);
            }
            // Final fallback to base64 conversion
            else {
                throw new Error("No usable file data found");
            }
            // Create poll with image data
            const newPoll = await pollModel_1.default.create({
                title,
                description,
                thumbnail: {
                    data: imageBuffer,
                    contentType: thumbnail.mimetype
                },
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                createdBy: req.user.id,
                options: [],
                votedUsers: [],
                isResultVisible: true,
            });
            // Clean up temp file if used
            if (tempFilePath) {
                await promises_1.default.unlink(tempFilePath).catch(cleanupError => {
                    console.error("Failed to delete temp file:", cleanupError);
                });
            }
            res.status(201).json({
                success: true,
                data: newPoll
            });
            return;
        }
        catch (fileError) {
            // Clean up temp file if error occurred
            if (tempFilePath) {
                await promises_1.default.unlink(tempFilePath).catch(cleanupError => {
                    console.error("Failed to cleanup temp file:", cleanupError);
                });
            }
            throw fileError;
        }
    }
    catch (error) {
        console.error("Poll creation error:", error);
        next(new ErrorModels_1.default(error instanceof Error ? error.message : "Failed to create poll", 500));
        return;
    }
};
exports.addPoll = addPoll;
/**
 * @desc    Get all polls
 * @route   GET /api/polls
 * @access  Private
 */
const getPolls = async (req, res, next) => {
    try {
        const polls = await pollModel_1.default.find()
            .populate('createdBy', 'name email')
            .populate('options')
            .sort('-createdAt');
        res.status(200).json({
            success: true,
            count: polls.length,
            data: polls
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to fetch polls", 500));
    }
};
exports.getPolls = getPolls;
/**
 * @desc    Get all active polls (current date between start and end date)
 * @route   GET /api/polls/active
 * @access  Private
 */
const getActivePolls = async (req, res, next) => {
    try {
        const now = new Date();
        const activePolls = await pollModel_1.default.find({
            startDate: { $lte: now },
            endDate: { $gte: now }
        })
            .populate('options')
            .sort('-createdAt');
        res.status(200).json({
            success: true,
            count: activePolls.length,
            data: activePolls
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to fetch active polls", 500));
    }
};
exports.getActivePolls = getActivePolls;
/**
 * @desc    Get single poll by ID
 * @route   GET /api/polls/:id
 * @access  Private
 */
const getPoll = async (req, res, next) => {
    try {
        const poll = await pollModel_1.default.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('options')
            .populate('votedUsers', 'name email');
        if (!poll) {
            return next(new ErrorModels_1.default("Poll not found", 404));
        }
        res.status(200).json({
            success: true,
            data: poll
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to fetch poll", 500));
    }
};
exports.getPoll = getPoll;
/**
 * @desc    Get all options for a specific poll
 * @route   GET /api/polls/:id/options
 * @access  Private
 */
const getOptionOfPoll = async (req, res, next) => {
    try {
        const options = await optionModel_1.default.find({ poll: req.params.id })
            .populate('votedBy', 'name email')
            .sort('-voteCount');
        res.status(200).json({
            success: true,
            count: options.length,
            data: options
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to fetch poll options", 500));
    }
};
exports.getOptionOfPoll = getOptionOfPoll;
/**
 * @desc    Get all users who voted in a specific poll
 * @route   GET /api/polls/:id/users
 * @access  Private/Admin
 */
const getPollUsers = async (req, res, next) => {
    try {
        if (!req.user?.isAdmin) {
            return next(new ErrorModels_1.default("Only admins can access voter information", 403));
        }
        const poll = await pollModel_1.default.findById(req.params.id)
            .populate('votedUsers', 'name email matricNumber')
            .select('votedUsers');
        if (!poll) {
            return next(new ErrorModels_1.default("Poll not found", 404));
        }
        res.status(200).json({
            success: true,
            count: poll.votedUsers.length,
            data: poll.votedUsers
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to fetch poll voters", 500));
    }
};
exports.getPollUsers = getPollUsers;
/**
 * @desc    Delete a poll
 * @route   DELETE /api/polls/:id
 * @access  Private/Admin
 */
const removePoll = async (req, res, next) => {
    try {
        if (!req.user?.isAdmin) {
            return next(new ErrorModels_1.default("Only admins can delete polls", 403));
        }
        const poll = await pollModel_1.default.findByIdAndDelete(req.params.id);
        if (!poll) {
            return next(new ErrorModels_1.default("Poll not found", 404));
        }
        // Delete all associated options
        await optionModel_1.default.deleteMany({ poll: req.params.id });
        res.status(200).json({
            success: true,
            data: {}
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to delete poll", 500));
    }
};
exports.removePoll = removePoll;
/**
 * @desc    Update a poll
 * @route   PATCH /api/polls/:id
 * @access  Private/Admin
 */
const updatePoll = async (req, res, next) => {
    try {
        if (!req.user?.isAdmin) {
            return next(new ErrorModels_1.default("Only admins can update polls", 403));
        }
        const { title, description, startDate, endDate, isResultVisible } = req.body;
        const updates = {};
        if (title)
            updates.title = title;
        if (description)
            updates.description = description;
        if (startDate)
            updates.startDate = new Date(startDate);
        if (endDate)
            updates.endDate = new Date(endDate);
        if (typeof isResultVisible === 'boolean')
            updates.isResultVisible = isResultVisible;
        // Validate dates if both are provided
        if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
            return next(new ErrorModels_1.default("End date must be after start date", 422));
        }
        const updatedPoll = await pollModel_1.default.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!updatedPoll) {
            return next(new ErrorModels_1.default("Poll not found", 404));
        }
        res.status(200).json({
            success: true,
            data: updatedPoll
        });
    }
    catch (error) {
        return next(new ErrorModels_1.default("Failed to update poll", 500));
    }
};
exports.updatePoll = updatePoll;
