// utils/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';


import HttpError from '../models/ErrorModels'; // Use the correct relative path

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!
});

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
}

export const uploadToCloudinary = async (
  filePath: string
): Promise<CloudinaryResult> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'poll-thumbnails',
      resource_type: 'image'
    });

    // Delete local file after successful upload
    await fs.unlink(filePath);

    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (uploadError: any) {
    console.error("Upload error:", uploadError);

    // Attempt to delete file if it exists
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error("Failed to delete file after upload error:", err);
    }

    throw new HttpError("Failed to process image upload", 500);
  }
};
