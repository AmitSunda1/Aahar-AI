"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.signRefreshToken = exports.signAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_1 = require("../config/env.config");
const appError_1 = __importDefault(require("./appError"));
const signAccessToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId: userId.toString() }, env_config_1.env.JWT_ACCESS_SECRET, {
        expiresIn: (env_config_1.env.JWT_ACCESS_EXPIRES_IN || "15m"),
    });
};
exports.signAccessToken = signAccessToken;
const signRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId: userId.toString() }, env_config_1.env.JWT_REFRESH_SECRET, {
        expiresIn: (env_config_1.env.JWT_REFRESH_EXPIRES_IN || "7d"),
    });
};
exports.signRefreshToken = signRefreshToken;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_config_1.env.JWT_ACCESS_SECRET);
    }
    catch (error) {
        throw new appError_1.default("Invalid or expired access token", 401, "INVALID_ACCESS_TOKEN");
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_config_1.env.JWT_REFRESH_SECRET);
    }
    catch (error) {
        throw new appError_1.default("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
