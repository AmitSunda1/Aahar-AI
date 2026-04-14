import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../user/user.model";
import AppError from "../../utils/appError";
import asyncHandler from "../../utils/asyncHandler";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import {
  attachCookiesToResponse,
  clearCookiesFromResponse,
} from "../../utils/cookie";
import { generateOtp } from "../../utils/otp";
import {
  sendOtpEmail,
  sendResetPasswordEmail,
} from "../../services/email/email.service";
import mongoose from "mongoose";
import {
  signupValidator,
  loginValidator,
  verifyOtpValidator,
  resendOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../../validators/auth.validator";
import { env } from "../../config/env.config";

const createSendToken = (
  user: any,
  statusCode: number,
  res: Response,
  message: string,
) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Set cookies
  attachCookiesToResponse(res, accessToken, refreshToken);

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
export const signup = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const parsed = signupValidator.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }
    const { email, password } = parsed.data;

    // Check if a VERIFIED user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return next(new AppError("Email already in use", 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP and hash it for storage
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existingUser && !existingUser.isEmailVerified) {
      // User exists but is unverified — update credentials and resend OTP
      existingUser.password = hashedPassword;
      existingUser.otp = hashedOtp;
      existingUser.otpExpiry = otpExpiry;
      await existingUser.save();
    } else {
      // Create brand new unverified user
      await User.create({
        email,
        password: hashedPassword,
        isEmailVerified: false,
        isCompletedOnboarding: false,
        otp: hashedOtp,
        otpExpiry,
      });
    }

    // Send OTP email (plain-text OTP, not the hash)
    await sendOtpEmail(email, otp);

    res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify your account.",
    });
  },
);

// ─────────────────────────────────────────────
// VERIFY OTP — validates OTP, activates account
// ─────────────────────────────────────────────
export const verifyOtp = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const parsed = verifyOtpValidator.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }
    const { email, otp } = parsed.data;

    // Explicitly select otp and otpExpiry (they have select: false)
    const user = await User.findOne({ email }).select("+otp +otpExpiry");

    if (!user) {
      return next(new AppError("No account found with this email", 404));
    }

    if (user.isEmailVerified) {
      return next(new AppError("Email is already verified", 400));
    }

    if (!user.otp || !user.otpExpiry) {
      return next(new AppError("No OTP found. Please request a new one.", 400));
    }

    // Check expiry
    if (user.otpExpiry < new Date()) {
      return next(
        new AppError("OTP has expired. Please request a new one.", 400),
      );
    }

    // Compare submitted OTP against the stored hash
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return next(new AppError("Invalid OTP. Please try again.", 400));
    }

    // OTP is valid — activate account and clear OTP fields
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Issue tokens and log the user in
    createSendToken(
      user,
      200,
      res,
      "Email verified successfully. Welcome to Aahar AI!",
    );
  },
);

// ─────────────────────────────────────────────
// RESEND OTP — regenerates and resends the OTP
// ─────────────────────────────────────────────
export const resendOtp = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const parsed = resendOtpValidator.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }
    const { email } = parsed.data;

    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("No account found with this email", 404));
    }

    if (user.isEmailVerified) {
      return next(new AppError("This email is already verified", 400));
    }

    // Generate a fresh OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = hashedOtp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  },
);

// ─────────────────────────────────────────────
// LOGIN — rejects unverified users
// ─────────────────────────────────────────────
export const login = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const parsed = loginValidator.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password as string))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    // Block login for unverified accounts
    if (!user.isEmailVerified) {
      return next(
        new AppError(
          "Please verify your email before logging in. Check your inbox for the OTP.",
          403,
          "EMAIL_NOT_VERIFIED",
        ),
      );
    }

    createSendToken(user, 200, res, "Successfully logged in");
  },
);

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
export const refresh = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return next(new AppError("No refresh token provided", 401, "NO_REFRESH"));
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(
          new AppError(
            "The user belonging to this token no longer exists.",
            401,
            "UNAUTHORIZED",
          ),
        );
      }

      const newAccessToken = signAccessToken(
        user._id as mongoose.Types.ObjectId,
      );
      attachCookiesToResponse(res, newAccessToken);

      res.status(200).json({
        success: true,
        message: "Access token refreshed",
      });
    } catch (error) {
      return next(
        new AppError(
          "Invalid or expired refresh token",
          401,
          "INVALID_REFRESH",
        ),
      );
    }
  },
);

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
export const logout = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    clearCookiesFromResponse(res);

    res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  },
);

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const parsed = forgotPasswordValidator.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email }).select("+isEmailVerified");

    if (!user) {
      return next(new AppError("No account found with this email", 404));
    }

    if (!user.isEmailVerified) {
      return next(
        new AppError(
          "Please verify your email before requesting a password reset.",
          403,
          "EMAIL_NOT_VERIFIED",
        ),
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(user.email, resetLink);

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  },
);

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const parsed = resetPasswordValidator.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }

    const { token, newPassword } = parsed.data;
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedResetToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return next(new AppError("Reset link is invalid or has expired", 400));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res, "Password reset successful");
  },
);

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────
export const getMe = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  },
);

// CHANGE PASSWORD
// ─────────────────────────────────────────────
export const changePassword = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const userId = String(req.user!._id);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(
        new AppError("currentPassword and newPassword are required", 400),
      );
    }

    if (newPassword.length < 6) {
      return next(
        new AppError("New password must be at least 6 characters", 400),
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password || "",
    );
    if (!isPasswordValid) {
      return next(new AppError("Current password is incorrect", 401));
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  },
);
