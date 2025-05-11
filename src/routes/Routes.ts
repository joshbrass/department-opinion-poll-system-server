import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUser
} from "../controllers/userController";

import {
  addPoll,
  getPolls,
  getActivePolls,
  getPoll,
  removePoll,
  updatePoll,
  getOptionOfPoll,
  getPollUsers
} from "../controllers/pollController"; 

import {
  addOption,
  getOption,
  removeOption,
  voteOption
} from "../controllers/optionController"; 

import { protect, admin } from '../middleware/authMiddleware';

const router = Router();

// ==== User Routes ====
router.post('/users/register', registerUser);
router.post('/users/login', loginUser);
router.get('/users/:id', protect, getUser);

// ==== Poll Routes ====
router.post('/polls',protect, admin, addPoll); 
router.get('/polls', protect, getPolls); 
router.get('/polls/active', protect, getActivePolls); 
router.get('/polls/:id', protect, getPoll); 
router.delete('/polls/:id', protect, admin, removePoll); 
router.patch('/polls/:id', protect, admin, updatePoll); 

// Option-related poll routes
router.get('/polls/:id/options', protect, getOptionOfPoll); 
router.get('/polls/:id/users', protect, admin, getPollUsers); 

// ==== Option Routes ====
router.post('/options', protect, addOption); 
router.get('/options/:id', protect, getOption); 
router.delete('/options/:id', protect, admin, removeOption); 
router.patch('/options/:id', protect, voteOption); 

export default router;