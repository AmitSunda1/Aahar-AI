"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtpValidator = exports.verifyOtpValidator = exports.loginValidator = exports.signupValidator = void 0;
const zod_1 = require("zod");
exports.signupValidator = zod_1.z.object({
    email: zod_1.z.string().email("Please provide a valid email"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.loginValidator = zod_1.z.object({
    email: zod_1.z.string().email("Please provide a valid email"),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.verifyOtpValidator = zod_1.z.object({
    email: zod_1.z.string().email("Please provide a valid email"),
    otp: zod_1.z.string().length(6, "OTP must be exactly 6 digits"),
});
exports.resendOtpValidator = zod_1.z.object({
    email: zod_1.z.string().email("Please provide a valid email"),
});
