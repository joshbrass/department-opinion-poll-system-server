import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs/promises";
import fileUpload, { UploadedFile } from "express-fileupload";
import { Types } from "mongoose";
import HttpError from "../models/ErrorModels";
import Poll from "../models/pollModel";
import Option from "../models/optionModel";

/**
 * @desc    Create a new poll
 * @route   POST /api/polls
 * @access  Private/Admin
 */
export const addPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Validate admin privileges
  if (!req.user?.isAdmin) {
    next(new HttpError("Only admins can create polls", 403));
    return;
  }

  // Destructure and validate required fields
  const { title, description, startDate, endDate } = req.body;
  const missingFields = [];
  if (!title) missingFields.push('title');
  if (!description) missingFields.push('description');
  if (!startDate) missingFields.push('startDate');
  if (!endDate) missingFields.push('endDate');

  if (missingFields.length > 0) {
    next(new HttpError(
      `Missing required fields: ${missingFields.join(', ')}`, 
      422
    ));
    return;
  }

  // Date validation
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    next(new HttpError(
      "Invalid date format. Please use ISO format (YYYY-MM-DDTHH:MM:SSZ)",
      422
    ));
    return;
  }

  if (parsedStartDate >= parsedEndDate) {
    next(new HttpError(
      "End date must be after start date",
      422
    ));
    return;
  }

  // File upload validation
  if (!req.files?.thumbnail) {
    next(new HttpError("Please upload a thumbnail image", 422));
    return;
  }

  const thumbnail = req.files.thumbnail as fileUpload.UploadedFile;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxFileSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes.includes(thumbnail.mimetype)) {
    next(new HttpError(
      "Only JPEG, PNG, or WebP images are allowed",
      422
    ));
    return;
  }

  if (thumbnail.size > maxFileSize) {
    next(new HttpError(
      `Image size must be less than ${maxFileSize / (1024 * 1024)}MB`,
      422
    ));
    return;
  }

  try {
    // Process image file
    let imageBuffer: Buffer;
    let tempFilePath: string | undefined;

    try {
  // Try to use in-memory buffer first
  if (thumbnail.data && thumbnail.data.length > 0) {
    imageBuffer = thumbnail.data;
  } 
  // Fallback to temp file if buffer is empty
  else if (thumbnail.tempFilePath) {
    tempFilePath = thumbnail.tempFilePath;
    try {
      imageBuffer = await fs.readFile(tempFilePath);
    } catch (readError) {
      throw new Error(`Failed to read temp file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
    }
  }
  // Final fallback to base64 conversion
  else {
    throw new Error("No usable file data found");
  }

      // Create poll with image data
      const newPoll = await Poll.create({
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
        await fs.unlink(tempFilePath).catch(cleanupError => {
          console.error("Failed to delete temp file:", cleanupError);
        });
      }

      res.status(201).json({ 
        success: true, 
        data: newPoll 
      });
      return;

    } catch (fileError) {
      // Clean up temp file if error occurred
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(cleanupError => {
          console.error("Failed to cleanup temp file:", cleanupError);
        });
      }
      throw fileError;
    }

  } catch (error) {
    console.error("Poll creation error:", error);
    next(new HttpError(
      error instanceof Error ? error.message : "Failed to create poll",
      500
    ));
    return;
  }
}
/**
 * @desc    Get all polls
 * @route   GET /api/polls
 * @access  Private
 */
export const getPolls = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const polls = await Poll.find()
      .populate('createdBy', 'name email')
      .populate('options')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: polls.length,
      data: polls
    });
  } catch (error) {
    return next(new HttpError("Failed to fetch polls", 500));
  }
};

/**
 * @desc    Get all active polls (current date between start and end date)
 * @route   GET /api/polls/active
 * @access  Private
 */
export const getActivePolls = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();
    const activePolls = await Poll.find({
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
  } catch (error) {
    return next(new HttpError("Failed to fetch active polls", 500));
  }
};

/**
 * @desc    Get single poll by ID
 * @route   GET /api/polls/:id
 * @access  Private
 */
export const getPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('options')
      .populate('votedUsers', 'name email');

    if (!poll) {
      return next(new HttpError("Poll not found", 404));
    }

    res.status(200).json({
      success: true,
      data: poll
    });
  } catch (error) {
    return next(new HttpError("Failed to fetch poll", 500));
  }
};

/**
 * @desc    Get all options for a specific poll
 * @route   GET /api/polls/:id/options
 * @access  Private
 */
export const getOptionOfPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const options = await Option.find({ poll: req.params.id })
      .populate('votedBy', 'name email')
      .sort('-voteCount');

    res.status(200).json({
      success: true,
      count: options.length,
      data: options
    });
  } catch (error) {
    return next(new HttpError("Failed to fetch poll options", 500));
  }
};

/**
 * @desc    Get all users who voted in a specific poll
 * @route   GET /api/polls/:id/users
 * @access  Private/Admin
 */
export const getPollUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.isAdmin) {
      return next(new HttpError("Only admins can access voter information", 403));
    }

    const poll = await Poll.findById(req.params.id)
      .populate('votedUsers', 'name email matricNumber')
      .select('votedUsers');

    if (!poll) {
      return next(new HttpError("Poll not found", 404));
    }

    res.status(200).json({
      success: true,
      count: poll.votedUsers.length,
      data: poll.votedUsers
    });
  } catch (error) {
    return next(new HttpError("Failed to fetch poll voters", 500));
  }
};

/**
 * @desc    Delete a poll
 * @route   DELETE /api/polls/:id
 * @access  Private/Admin
 */
export const removePoll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.isAdmin) {
      return next(new HttpError("Only admins can delete polls", 403));
    }

    const poll = await Poll.findByIdAndDelete(req.params.id);

    if (!poll) {
      return next(new HttpError("Poll not found", 404));
    }

    // Delete all associated options
    await Option.deleteMany({ poll: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    return next(new HttpError("Failed to delete poll", 500));
  }
};

/**
 * @desc    Update a poll
 * @route   PATCH /api/polls/:id
 * @access  Private/Admin
 */
export const updatePoll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.isAdmin) {
      return next(new HttpError("Only admins can update polls", 403));
    }

    const { title, description, startDate, endDate, isResultVisible } = req.body;
    const updates: any = {};

    if (title) updates.title = title;
    if (description) updates.description = description;
    if (startDate) updates.startDate = new Date(startDate);
    if (endDate) updates.endDate = new Date(endDate);
    if (typeof isResultVisible === 'boolean') updates.isResultVisible = isResultVisible;

    // Validate dates if both are provided
    if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
      return next(new HttpError("End date must be after start date", 422));
    }

    const updatedPoll = await Poll.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedPoll) {
      return next(new HttpError("Poll not found", 404));
    }

    res.status(200).json({
      success: true,
      data: updatedPoll
    });
  } catch (error) {
    return next(new HttpError("Failed to update poll", 500));
  }
};

