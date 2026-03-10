import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";
import asyncHandler from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/jwt";
import User from "../modules/user/user.model";

export const authenticate = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        // 1. Get token from cookies or authorization header
        let token;

        if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return next(
                new AppError("You are not logged in. Please log in to get access.", 401, "UNAUTHORIZED")
            );
        }

        // 2. Verify token
        const decoded = verifyAccessToken(token);

        // 3. Check if user still exists
        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return next(
                new AppError(
                    "The user belonging to this token does no longer exist.",
                    401,
                    "UNAUTHORIZED"
                )
            );
        }

        // Grant access to protected route
        req.user = currentUser;
        next();
    }
);
