import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import HttpError from "../models/ErrorModels";
import Poll from "../models/pollModel";
import Option from "../models/optionModel";

// ========================= ADD OPTION
// POST : api/options
// PROTECTED (only admin)
export const addOption = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Authorization check
    if (!req.user?.isAdmin) {
      return next(new HttpError("Only admins can perform this action", 403));
    }

    // Validate required fields
    const { answer, pollId } = req.body;
    if (!answer || !pollId) {
      return next(new HttpError("Please provide both answer and pollId", 422));
    }

    // Verify poll exists
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return next(new HttpError("Poll not found", 404));
    }

    // Prevent adding options to expired polls
    if (new Date() > new Date(poll.endDate)) {
      return next(new HttpError("Cannot add options to expired polls", 400));
    }

    // Create new option
    const newOption = await Option.create({
      answer,
      poll: pollId,
      voteCount: 0,
      votedBy: []
    });

    // Add option to poll's options array
    poll.options.push(newOption._id as Types.ObjectId);

    await poll.save();

    res.status(201).json({
      success: true,
      data: newOption
    });

  } catch (error) {
    console.error("Add option error:", error);
    return next(new HttpError(
      error instanceof Error ? error.message : "Failed to add option",
      500
    ));
  }
};

// ========================= GET OPTION
// GET : api/options/:id
// PROTECTED 
export const getOption = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const option = await Option.findById(req.params.id)
      .populate('poll', 'title')
      .populate('votedBy', 'name email');

    if (!option) {
      return next(new HttpError("Option not found", 404));
    }

    res.status(200).json({
      success: true,
      data: option
    });

  } catch (error) {
    console.error("Get option error:", error);
    return next(new HttpError(
      error instanceof Error ? error.message : "Failed to get option",
      500
    ));
  }
};

// ========================= DELETE OPTION
// DELETE : api/options/:id
// PROTECTED (only admin)
export const removeOption = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Authorization check
    if (!req.user?.isAdmin) {
      return next(new HttpError("Only admins can perform this action", 403));
    }

    const option = await Option.findById(req.params.id);
    if (!option) {
      return next(new HttpError("Option not found", 404));
    }

    // Remove option from poll's options array
    await Poll.findByIdAndUpdate(
      option.poll,
      { $pull: { options: option._id } }
    );

    // Delete the option
    await Option.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Option deleted successfully"
    });

  } catch (error) {
    console.error("Delete option error:", error);
    return next(new HttpError(
      error instanceof Error ? error.message : "Failed to delete option",
      500
    ));
  }
};

// ========================= VOTE OPTION
// PATCH : api/options/:id
// PROTECTED 
export const voteOption = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new HttpError("User not authenticated", 401));
    }

    const option = await Option.findById(req.params.id).populate('poll');
    if (!option) {
      return next(new HttpError("Option not found", 404));
    }

    const poll = option.poll as any;

    // Check if poll is active
    const now = new Date();
    if (now < new Date(poll.startDate) || now > new Date(poll.endDate)) {
      return next(new HttpError("Voting is only allowed during the poll period", 400));
    }

    // Check if user already voted in this poll
    const existingVote = await Option.findOne({
      poll: poll._id,
      votedBy: userId
    });

    if (existingVote) {
      return next(new HttpError("You have already voted in this poll", 400));
    }

    // Update the option with new vote
    const updatedOption = await Option.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { voteCount: 1 },
        $push: { votedBy: userId }
      },
      { new: true }
    );

    // Add user to poll's votedUsers array
    await Poll.findByIdAndUpdate(
      poll._id,
      { $addToSet: { votedUsers: userId } }
    );

    res.status(200).json({
      success: true,
      data: updatedOption
    });

  } catch (error) {
    console.error("Vote option error:", error);
    return next(new HttpError(
      error instanceof Error ? error.message : "Failed to process vote",
      500
    ));
  }
};