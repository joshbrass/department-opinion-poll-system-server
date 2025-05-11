"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = require("mongoose");
const dotenv_1 = __importDefault(require("dotenv"));
const Routes_1 = __importDefault(require("@routes/Routes"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const errorMiddleware_1 = require("@middleware/errorMiddleware");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables from .env file
dotenv_1.default.config();
// Validate required environment variables
const requiredEnvVars = ['MONGO_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}
// Initialize Express application
const app = (0, express_1.default)();
// Create required directories if they don't exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
const uploadDir = path_1.default.join(__dirname, "uploads");
const tempDir = path_1.default.join(__dirname, "tmp");
ensureDirectoryExists(uploadDir);
ensureDirectoryExists(tempDir);
// Middleware Configuration
app.use(express_1.default.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: process.env.URLENCODED_LIMIT || '10mb'
}));
// CORS Configuration
const corsOptions = {
    credentials: true,
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'https://department-opinion-poll-system-a3sn.vercel.app']
};
app.use((0, cors_1.default)(corsOptions));
// File Upload Configuration
app.use((0, express_fileupload_1.default)({
    useTempFiles: true,
    tempFileDir: tempDir,
    limits: {
        fileSize: parseInt(process.env.FILE_UPLOAD_LIMIT || '5242880'), // 5MB default
        files: 1
    },
    abortOnLimit: true,
    responseOnLimit: process.env.FILE_UPLOAD_LIMIT_MESSAGE || "File size exceeds the limit",
    preserveExtension: 4,
    safeFileNames: true,
    parseNested: true
}));
// Static Files Serving
app.use("/uploads", express_1.default.static(uploadDir));
// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        serverTime: new Date().toISOString(),
        uploadDir,
        tempDir,
        environment: process.env.NODE_ENV || 'development'
    });
});
// API Routes
app.use('/api', Routes_1.default);
// Error Handling Middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// Server Configuration
const PORT = parseInt(process.env.PORT || '5000', 10);
const MONGO_URL = process.env.MONGO_URL;
// MongoDB Connection Options
const mongoOptions = {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '10'),
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
};
// Server Startup Function
async function startServer() {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await (0, mongoose_1.connect)(MONGO_URL, mongoOptions);
        console.log('✅ MongoDB connected successfully');
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📁 Upload directory: ${uploadDir}`);
            console.log(`📁 Temp directory: ${tempDir}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔄 CORS allowed origins: ${corsOptions.origin.join(', ')}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                console.log('🔴 Process terminated');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            console.log('🛑 SIGINT received. Shutting down gracefully...');
            server.close(() => {
                console.log('🔴 Process terminated');
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer();
