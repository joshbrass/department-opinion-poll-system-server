import { Types } from 'mongoose';
import { UploadedFile } from 'express-fileupload';

declare module 'express-fileupload' {
  interface FileArray {
    thumbnail?: UploadedFile;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: Types.ObjectId; // make this an ObjectId, not a string
        isAdmin: boolean;
      };
      files?: FileArray;
    }
  }
}
