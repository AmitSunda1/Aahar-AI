import { Request, Response } from "express";
import User from "./user.model";
import AppError from "../../utils/appError";
import asyncHandler from "../../utils/asyncHandler";
import { onboardingValidator } from "../../validators/onboarding.validator";

// ─── POST /onboarding — Save all profile data ──────────────────────────────────

export const saveOnboarding = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    // Validate input
    const result = onboardingValidator.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      console.error("Zod Validation Failed:", result.error.issues);
      return next(
        new AppError(
          `${firstError.path.join(".")}: ${firstError.message}`,
          400,
          "VALIDATION_ERROR",
        ),
      );
    }

    const {
      name,
      gender,
      age,
      height,
      weight,
      goal,
      activityLevel,
      dailySteps,
      dietaryPreferences,
      medicalConditions,
    } = result.data;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        name,
        gender,
        age,
        height,
        weight,
        goal,
        activityLevel,
        dailySteps,
        dietaryPreferences,
        medicalConditions,
        isCompletedOnboarding: true,
      },
      { new: true, runValidators: true },
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
      data: { user },
    });
  },
);

// ─── GET /onboarding — Fetch saved profile data ──────────────────────────────

export const getOnboarding = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const user = await User.findById(req.user!._id).select(
      "name gender age height weight goal activityLevel dailySteps dietaryPreferences medicalConditions isCompletedOnboarding",
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  },
);
