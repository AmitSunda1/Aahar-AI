import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import AppError from "../../utils/appError";
import User from "../user/user.model";
import {
  analyzeFoodImage,
} from "../../services/ai/foodAnalysis.service";
import { analyzeFoodRequestValidator } from "../../validators/foodAnalysis.validator";
import {
  getUserProgress,
  upsertDailyProgress,
} from "../progress/userProgress.service";

/**
 * POST /food/analyze
 * Analyze food image and description to extract nutritional content
 * Body: { image: base64string, mimeType: string, description: string, quantity?: number, unit?: string, notes?: string }
 * Returns: { foodName, description, macros: { calories, protein, carbs, fat }, confidence, ... }
 */
export const analyzeFoodHandler = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const userId = String(req.user!._id);

    // Verify user exists and completed onboarding
    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));
    if (!user.isCompletedOnboarding) {
      return next(new AppError("Complete onboarding first", 400));
    }

    const { image, mimeType, description, quantity, unit, notes } = req.body;

    // Validate request body
    if (!image || !mimeType) {
      return next(
        new AppError("Image and mimeType are required", 400),
      );
    }

    if (!description) {
      return next(
        new AppError("Food description is required", 400),
      );
    }

    // Validate description and optional fields
    const validationResult = analyzeFoodRequestValidator.safeParse({
      description,
      quantity,
      unit,
      notes,
    });

    if (!validationResult.success) {
      return next(
        new AppError(
          validationResult.error.issues[0]?.message ||
            "Invalid request data",
          400,
        ),
      );
    }

    try {
      // Call Gemini to analyze food
      const analysis = await analyzeFoodImage(
        image,
        mimeType,
        validationResult.data,
      );

      res.status(200).json({
        success: true,
        message: "Food analysis completed",
        data: analysis,
      });
    } catch (error) {
      if (error instanceof AppError) {
        // Handle rate limit errors specially with retry guidance
        if (error.code === "GEMINI_QUOTA_EXCEEDED") {
          return next(
            new AppError(
              error.message +
                " Please wait a moment and try again.",
              error.statusCode,
              error.code,
            ),
          );
        }
        return next(error);
      }
      return next(
        new AppError(
          "Failed to analyze food image",
          500,
          "ANALYSIS_FAILED",
        ),
      );
    }
  },
);

/**
 * POST /food/log
 * Log analyzed food to user's daily progress
 * Body: { foodName, macros: { calories, protein, carbs, fat }, mealType?: string }
 * Returns: Updated dashboard with new totals
 */
export const logFoodHandler = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const userId = String(req.user!._id);

    const { foodName, macros } = req.body;

    if (!foodName || !macros) {
      return next(
        new AppError("foodName and macros are required", 400),
      );
    }

    const { calories, protein, carbs, fat } = macros;

    if (
      typeof calories !== "number" ||
      typeof protein !== "number" ||
      typeof carbs !== "number" ||
      typeof fat !== "number"
    ) {
      return next(
        new AppError("Invalid macros format", 400),
      );
    }

    try {
      // Update user's daily progress for today
      await upsertDailyProgress(
        userId,
        new Date(), // Today's date
        {
          caloriesConsumed: calories,
          proteinConsumed: protein,
          carbsConsumed: carbs,
          fatConsumed: fat,
        },
        [`Logged: ${foodName}`],
      );

      const user = await User.findById(userId);
      if (!user) return next(new AppError("User not found", 404));

      const progress = await getUserProgress(userId);

      res.status(200).json({
        success: true,
        message: `Food "${foodName}" logged successfully`,
        data: {
          logged: {
            foodName,
            macros,
          },
          updatedProgress: progress,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      return next(
        new AppError(
          "Failed to log food",
          500,
          "LOG_FAILED",
        ),
      );
    }
  },
);
