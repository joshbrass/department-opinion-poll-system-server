"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
// utils/cloudinary.ts
const cloudinary_1 = require("cloudinary");
const promises_1 = __importDefault(require("fs/promises"));
const ErrorModels_1 = __importDefault(require("../models/ErrorModels")); // Use the correct relative path
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadToCloudinary = async (filePath) => {
    try {
        const result = await cloudinary_1.v2.uploader.upload(filePath, {
            folder: 'poll-thumbnails',
            resource_type: 'image'
        });
        // Delete local file after successful upload
        await promises_1.default.unlink(filePath);
        return {
            secure_url: result.secure_url,
            public_id: result.public_id
        };
    }
    catch (uploadError) {
        console.error("Upload error:", uploadError);
        // Attempt to delete file if it exists
        try {
            await promises_1.default.unlink(filePath);
        }
        catch (err) {
            console.error("Failed to delete file after upload error:", err);
        }
        throw new ErrorModels_1.default("Failed to process image upload", 500);
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
