"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const pollController_1 = require("../controllers/pollController");
const optionController_1 = require("../controllers/optionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// ==== User Routes ====
router.post('/users/register', userController_1.registerUser);
router.post('/users/login', userController_1.loginUser);
router.get('/users/:id', authMiddleware_1.protect, userController_1.getUser);
// ==== Poll Routes ====
router.post('/polls', authMiddleware_1.protect, authMiddleware_1.admin, pollController_1.addPoll);
router.get('/polls', authMiddleware_1.protect, pollController_1.getPolls);
router.get('/polls/active', authMiddleware_1.protect, pollController_1.getActivePolls);
router.get('/polls/:id', authMiddleware_1.protect, pollController_1.getPoll);
router.delete('/polls/:id', authMiddleware_1.protect, authMiddleware_1.admin, pollController_1.removePoll);
router.patch('/polls/:id', authMiddleware_1.protect, authMiddleware_1.admin, pollController_1.updatePoll);
// Option-related poll routes
router.get('/polls/:id/options', authMiddleware_1.protect, pollController_1.getOptionOfPoll);
router.get('/polls/:id/users', authMiddleware_1.protect, authMiddleware_1.admin, pollController_1.getPollUsers);
// ==== Option Routes ====
router.post('/options', authMiddleware_1.protect, optionController_1.addOption);
router.get('/options/:id', authMiddleware_1.protect, optionController_1.getOption);
router.delete('/options/:id', authMiddleware_1.protect, authMiddleware_1.admin, optionController_1.removeOption);
router.patch('/options/:id', authMiddleware_1.protect, optionController_1.voteOption);
exports.default = router;
