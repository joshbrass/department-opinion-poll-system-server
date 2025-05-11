"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
// 404 Not Found Middleware
const notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
exports.notFound = notFound;
// Error Handler Middleware
const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(res.statusCode === 200 ? 500 : res.statusCode)
        .json({
        message: error.message || "An unknown error occurred",
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
};
exports.errorHandler = errorHandler;
