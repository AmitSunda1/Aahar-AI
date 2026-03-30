"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates a cryptographically secure 6-digit OTP string.
 * Using crypto.randomInt ensures uniform distribution — safer than Math.random().
 */
const generateOtp = () => {
    const otp = crypto_1.default.randomInt(100000, 999999);
    return otp.toString();
};
exports.generateOtp = generateOtp;
