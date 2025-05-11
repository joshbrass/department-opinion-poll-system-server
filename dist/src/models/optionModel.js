"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const optionSchema = new mongoose_1.Schema({
    answer: { type: String, required: true },
    poll: { type: mongoose_1.Schema.Types.ObjectId, ref: "Poll", required: true },
    voteCount: { type: Number, default: 0 },
    votedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
});
exports.default = (0, mongoose_1.model)("Option", optionSchema);
