"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const appError_1 = __importDefault(require("../utils/appError"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const jwt_1 = require("../utils/jwt");
const user_model_1 = __importDefault(require("../modules/user/user.model"));
exports.authenticate = (0, asyncHandler_1.default)(async (req, res, next) => {
    // 1. Get token from cookies or authorization header
    let token;
    if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }
    else if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return next(new appError_1.default("You are not logged in. Please log in to get access.", 401, "UNAUTHORIZED"));
    }
    // 2. Verify token
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    // 3. Check if user still exists
    const currentUser = await user_model_1.default.findById(decoded.userId);
    if (!currentUser) {
        return next(new appError_1.default("The user belonging to this token does no longer exist.", 401, "UNAUTHORIZED"));
    }
    // Grant access to protected route
    req.user = currentUser;
    next();
});
