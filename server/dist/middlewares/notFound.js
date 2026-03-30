"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notFoundMiddleware = (req, res, next) => {
    console.log("---notFoundMiddleware---");
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
exports.default = notFoundMiddleware;
