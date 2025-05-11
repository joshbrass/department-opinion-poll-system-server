import { Schema, model, Types, Document } from 'mongoose';

interface IPoll extends Document {
  title: string;
  description: string;
  thumbnail: string;
  options: Types.ObjectId[]; // References to option model
  votedUsers: Types.ObjectId[]; // Users who voted (renamed from 'users' for clarity)
  createdBy: Types.ObjectId; // Lecturer/admin who created the poll
  startDate: Date;
  endDate: Date;
  isResultVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pollSchema = new Schema<IPoll>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  thumbnail: {
    data: Buffer,
    contentType: String
  },
  options: [{ 
    type: Schema.Types.ObjectId, 
    required: true, 
    ref: "Option"
  }],
  votedUsers: [{ 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    default: [] // Initialize as empty array
  }],
  createdBy: { 
    type: Schema.Types.ObjectId, 
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

const Poll = model<IPoll>('Poll', pollSchema);
export default Poll;