import jwt from "jsonwebtoken";
import { env } from "../config/env.config";
import AppError from "./appError";
import mongoose from "mongoose";

interface TokenPayload {
    userId: string;
}

export const signAccessToken = (userId: mongoose.Types.ObjectId | string): string => {
    return jwt.sign({ userId: userId.toString() }, env.JWT_ACCESS_SECRET as string, {
        expiresIn: (env.JWT_ACCESS_EXPIRES_IN || "15m") as any,
    });
};

export const signRefreshToken = (userId: mongoose.Types.ObjectId | string): string => {
    return jwt.sign({ userId: userId.toString() }, env.JWT_REFRESH_SECRET as string, {
        expiresIn: (env.JWT_REFRESH_EXPIRES_IN || "7d") as any,
    });
};

export const verifyAccessToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, env.JWT_ACCESS_SECRET as string) as TokenPayload;
    } catch (error) {
        throw new AppError("Invalid or expired access token", 401, "INVALID_ACCESS_TOKEN");
    }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET as string) as TokenPayload;
    } catch (error) {
        throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
    }
};
