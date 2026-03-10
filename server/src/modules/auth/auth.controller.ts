import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../user/user.model";
import AppError from "../../utils/appError";
import asyncHandler from "../../utils/asyncHandler";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "../../utils/jwt";
import { attachCookiesToResponse, clearCookiesFromResponse } from "../../utils/cookie";
import mongoose from "mongoose";


const createSendToken = (
    user: any,
    statusCode: number,
    res: Response,
    message: string
) => {
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Set cookies
    attachCookiesToResponse(res, accessToken, refreshToken);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        success: true,
        message,
        data: {
            user,
        },
    });
};

export const signup = asyncHandler(
    async (req: Request, res: Response, next: any) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError("Please provide an email and password", 400));
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new AppError("Email already in use", 400));
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await User.create({
            email,
            password: hashedPassword,
            isCompletedOnboarding: false,
        });

        createSendToken(newUser, 201, res, "Successfully signed up");
    }
);

export const login = asyncHandler(
    async (req: Request, res: Response, next: any) => {
        const { email, password } = req.body;

        // 1. Check if email and password exist
        if (!email || !password) {
            return next(new AppError("Please provide email and password", 400));
        }

        // 2. Check if user exists && password is correct
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password as string))) {
            return next(new AppError("Incorrect email or password", 401));
        }

        // 3. If everything is ok, send token to client
        createSendToken(user, 200, res, "Successfully logged in");
    }
);

export const refresh = asyncHandler(
    async (req: Request, res: Response, next: any) => {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return next(new AppError("No refresh token provided", 401, "NO_REFRESH"));
        }

        try {
            // Verify refresh token
            const decoded = verifyRefreshToken(refreshToken);

            // Check if user still exists
            const user = await User.findById(decoded.userId);
            if (!user) {
                return next(
                    new AppError(
                        "The user belonging to this token no longer exists.",
                        401,
                        "UNAUTHORIZED"
                    )
                );
            }

            // Generate new access token
            const newAccessToken = signAccessToken(user._id as mongoose.Types.ObjectId);

            // Set new access token cookie using the utility
            attachCookiesToResponse(res, newAccessToken);

            res.status(200).json({
                success: true,
                message: "Access token refreshed",
            });
        } catch (error) {
            return next(
                new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH")
            );
        }
    }
);

export const logout = asyncHandler(
    async (req: Request, res: Response, next: any) => {
        clearCookiesFromResponse(res);

        res.status(200).json({
            success: true,
            message: "Successfully logged out",
        });
    }
);

export const getMe = asyncHandler(
    async (req: Request, res: Response, next: any) => {
        // Current user is already available on req.user from the authenticate middleware
        res.status(200).json({
            success: true,
            data: {
                user: req.user,
            },
        });
    }
);
