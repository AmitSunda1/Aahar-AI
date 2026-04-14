"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.logout = exports.refresh = exports.login = exports.resendOtp = exports.verifyOtp = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = __importDefault(require("../user/user.model"));
const appError_1 = __importDefault(require("../../utils/appError"));
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const jwt_1 = require("../../utils/jwt");
const cookie_1 = require("../../utils/cookie");
const otp_1 = require("../../utils/otp");
const email_service_1 = require("../../services/email/email.service");
const auth_validator_1 = require("../../validators/auth.validator");
const createSendToken = (user, statusCode, res, message) => {
    const accessToken = (0, jwt_1.signAccessToken)(user._id);
    const refreshToken = (0, jwt_1.signRefreshToken)(user._id);
    // Set cookies
    (0, cookie_1.attachCookiesToResponse)(res, accessToken, refreshToken);
    // Remove sensitive fields from output
    user.password = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;
    res.status(statusCode).json({
        success: true,
        message,
        data: {
            user,
        },
    });
};
// ─────────────────────────────────────────────
// SIGNUP — creates unverified user, sends OTP
// ─────────────────────────────────────────────
exports.signup = (0, asyncHandler_1.default)(async (req, res, next) => {
    const parsed = auth_validator_1.signupValidator.safeParse(req.body);
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const { email, password } = parsed.data;
    // Check if a VERIFIED user with this email already exists
    const existingUser = await user_model_1.default.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
        return next(new appError_1.default("Email already in use", 400));
    }
    // Hash password
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    // Generate OTP and hash it for storage
    const otp = (0, otp_1.generateOtp)();
    const hashedOtp = await bcryptjs_1.default.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    if (existingUser && !existingUser.isEmailVerified) {
        // User exists but is unverified — update credentials and resend OTP
        existingUser.password = hashedPassword;
        existingUser.otp = hashedOtp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();
    }
    else {
        // Create brand new unverified user
        await user_model_1.default.create({
            email,
            password: hashedPassword,
            isEmailVerified: false,
            isCompletedOnboarding: false,
            otp: hashedOtp,
            otpExpiry,
        });
    }
    // Send OTP email (plain-text OTP, not the hash)
    await (0, email_service_1.sendOtpEmail)(email, otp);
    res.status(201).json({
        success: true,
        message: "OTP sent to your email. Please verify your account.",
    });
});
// ─────────────────────────────────────────────
// VERIFY OTP — validates OTP, activates account
// ─────────────────────────────────────────────
exports.verifyOtp = (0, asyncHandler_1.default)(async (req, res, next) => {
    const parsed = auth_validator_1.verifyOtpValidator.safeParse(req.body);
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const { email, otp } = parsed.data;
    // Explicitly select otp and otpExpiry (they have select: false)
    const user = await user_model_1.default.findOne({ email }).select("+otp +otpExpiry");
    if (!user) {
        return next(new appError_1.default("No account found with this email", 404));
    }
    if (user.isEmailVerified) {
        return next(new appError_1.default("Email is already verified", 400));
    }
    if (!user.otp || !user.otpExpiry) {
        return next(new appError_1.default("No OTP found. Please request a new one.", 400));
    }
    // Check expiry
    if (user.otpExpiry < new Date()) {
        return next(new appError_1.default("OTP has expired. Please request a new one.", 400));
    }
    // Compare submitted OTP against the stored hash
    const isOtpValid = await bcryptjs_1.default.compare(otp, user.otp);
    if (!isOtpValid) {
        return next(new appError_1.default("Invalid OTP. Please try again.", 400));
    }
    // OTP is valid — activate account and clear OTP fields
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    // Issue tokens and log the user in
    createSendToken(user, 200, res, "Email verified successfully. Welcome to Aahar AI!");
});
// ─────────────────────────────────────────────
// RESEND OTP — regenerates and resends the OTP
// ─────────────────────────────────────────────
exports.resendOtp = (0, asyncHandler_1.default)(async (req, res, next) => {
    const parsed = auth_validator_1.resendOtpValidator.safeParse(req.body);
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const { email } = parsed.data;
    const user = await user_model_1.default.findOne({ email });
    if (!user) {
        return next(new appError_1.default("No account found with this email", 404));
    }
    if (user.isEmailVerified) {
        return next(new appError_1.default("This email is already verified", 400));
    }
    // Generate a fresh OTP
    const otp = (0, otp_1.generateOtp)();
    const hashedOtp = await bcryptjs_1.default.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otp = hashedOtp;
    user.otpExpiry = otpExpiry;
    await user.save();
    await (0, email_service_1.sendOtpEmail)(email, otp);
    res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your email.",
    });
});
// ─────────────────────────────────────────────
// LOGIN — rejects unverified users
// ─────────────────────────────────────────────
exports.login = (0, asyncHandler_1.default)(async (req, res, next) => {
    const parsed = auth_validator_1.loginValidator.safeParse(req.body);
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const { email, password } = parsed.data;
    const user = await user_model_1.default.findOne({ email }).select("+password");
    if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
        return next(new appError_1.default("Incorrect email or password", 401));
    }
    // Block login for unverified accounts
    if (!user.isEmailVerified) {
        return next(new appError_1.default("Please verify your email before logging in. Check your inbox for the OTP.", 403, "EMAIL_NOT_VERIFIED"));
    }
    createSendToken(user, 200, res, "Successfully logged in");
});
// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
exports.refresh = (0, asyncHandler_1.default)(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return next(new appError_1.default("No refresh token provided", 401, "NO_REFRESH"));
    }
    try {
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const user = await user_model_1.default.findById(decoded.userId);
        if (!user) {
            return next(new appError_1.default("The user belonging to this token no longer exists.", 401, "UNAUTHORIZED"));
        }
        const newAccessToken = (0, jwt_1.signAccessToken)(user._id);
        (0, cookie_1.attachCookiesToResponse)(res, newAccessToken);
        res.status(200).json({
            success: true,
            message: "Access token refreshed",
        });
    }
    catch (error) {
        return next(new appError_1.default("Invalid or expired refresh token", 401, "INVALID_REFRESH"));
    }
});
// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
exports.logout = (0, asyncHandler_1.default)(async (req, res, next) => {
    (0, cookie_1.clearCookiesFromResponse)(res);
    res.status(200).json({
        success: true,
        message: "Successfully logged out",
    });
});
// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────
exports.getMe = (0, asyncHandler_1.default)(async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: {
            user: req.user,
        },
    });
});
// CHANGE PASSWORD
// ─────────────────────────────────────────────
exports.changePassword = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = String(req.user._id);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return next(new appError_1.default("currentPassword and newPassword are required", 400));
    }
    if (newPassword.length < 6) {
        return next(new appError_1.default("New password must be at least 6 characters", 400));
    }
    const user = await user_model_1.default.findById(userId);
    if (!user) {
        return next(new appError_1.default("User not found", 404));
    }
    // Verify current password
    const isPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password || "");
    if (!isPasswordValid) {
        return next(new appError_1.default("Current password is incorrect", 401));
    }
    // Hash and update password
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password changed successfully",
    });
});
