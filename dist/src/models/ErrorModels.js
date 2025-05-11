"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}
exports.default = HttpError;
