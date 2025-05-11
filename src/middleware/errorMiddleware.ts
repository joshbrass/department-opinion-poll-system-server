import { Request, Response, NextFunction } from "express";

// 404 Not Found Middleware
export const notFound = (req: Request, res: Response, next: NextFunction) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Error Handler Middleware
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (res.headersSent) {
        return next(error);
    }

    res.status(res.statusCode === 200 ? 500 : res.statusCode)
       .json({
           message: error.message || "An unknown error occurred",
           stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
       });
};