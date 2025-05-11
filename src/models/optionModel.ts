import { Schema, model, Types, Document } from "mongoose";

interface OptionDocument extends Document {
  answer: string;
  poll: Types.ObjectId;
  voteCount: number;
  votedBy: Types.ObjectId[];
}

const optionSchema = new Schema<OptionDocument>({
  answer: { type: String, required: true },
  poll: { type: Schema.Types.ObjectId, ref: "Poll", required: true },
  voteCount: { type: Number, default: 0 },
  votedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

export default model<OptionDocument>("Option", optionSchema);