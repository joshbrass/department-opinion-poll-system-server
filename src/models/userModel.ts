import { Schema, model, Types, Document } from 'mongoose';

interface IUser extends Document {
  _id: Types.ObjectId;
  fullname: string;
  email: string;
  matricNumber?: string;
  password: string;
  role: 'student' | 'lecturer';
  votedPolls: Types.ObjectId[];
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  toJSON(): Omit<this, 'password'>;
}

const userSchema = new Schema<IUser>({
  fullname: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Simple but effective email regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  matricNumber: { 
    type: String, 
    unique: true,        // Field-level unique index (KEEP THIS)
    sparse: true,
    trim: true,
  },
  password: { type: String, required: true, select: false },
  role: { 
    type: String,
    required: true,
    enum: ['student', 'lecturer'],
    default: 'student',
  },
  votedPolls: [{ type: Schema.Types.ObjectId, ref: 'Poll' }],
  isAdmin: { 
    type: Boolean,
    default: function(this: IUser) {
      return this.role === 'lecturer';
    },
  },
}, { timestamps: true });

// Remove these duplicate index declarations:
// userSchema.index({ email: 1 }, { unique: true });          // DELETE THIS
// userSchema.index({ matricNumber: 1 }, { unique: true, sparse: true }); // DELETE THIS

// Keep this middleware
userSchema.pre('save', function(next) {
  this.isAdmin = this.role === 'lecturer';
  next();
});

const User = model<IUser>('User', userSchema);
export default User;