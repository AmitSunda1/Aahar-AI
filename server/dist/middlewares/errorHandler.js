"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const appError_1 = __importDefault(require("../utils/appError"));
const errorHandlerMiddleware = (err, req, res, next) => {
    console.log("---errorHandlerMiddleware---");
    console.log(err);
    let error;
    if (err instanceof appError_1.default) {
        error = err;
    }
    else {
        error = new appError_1.default(err.message || "Something went wrong, try again later", err.statusCode || 500);
    }
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors)
            .map((item) => item.message)
            .join(", ");
        error = new appError_1.default(message, 400, "VALIDATION_ERROR", err.errors);
    }
    // Handle Mongoose duplicate key errors
    if (err.code && err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        error = new appError_1.default(`${field} already exists`, 400, "DUPLICATE_KEY", {
            field,
            value: err.keyValue[field],
        });
    }
    // Handle Mongoose CastError
    if (err.name === "CastError") {
        error = new appError_1.default(`Invalid ${err.path}: ${err.value}`, 400, "CAST_ERROR", { path: err.path, value: err.value });
    }
    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
        error = new appError_1.default("Invalid token", 401, "INVALID_TOKEN");
    }
    if (err.name === "TokenExpiredError") {
        error = new appError_1.default("Token expired", 401, "TOKEN_EXPIRED");
    }
    // Build standardized error response
    const response = {
        success: false,
        message: error.message,
        error: {},
    };
    // Add error details if available
    const errorDetails = {};
    if (error.code) {
        errorDetails.code = error.code;
    }
    if (error.details) {
        errorDetails.details = error.details;
    }
    // Include stack trace in development mode
    if (process.env.NODE_ENV === "development") {
        errorDetails.stack = error.stack;
    }
    if (Object.keys(errorDetails).length > 0) {
        response.error = errorDetails;
    }
    res.status(error.statusCode).json(response);
};
exports.default = errorHandlerMiddleware;
