import { Request, Response } from "express";
import AppError from "../../utils/appError";
import asyncHandler from "../../utils/asyncHandler";
import User from "../user/user.model";
import {
  generateMealPlanWithGemini,
  isGeminiConfigured,
} from "../../services/ai/gemini.service";
import {
  buildDashboardFromState,
  buildGeminiMealPlanPrompt,
  buildPlanFromProfile,
  computeUserNutritionProfile,
  mapGeminiMealPlanToUserPlan,
} from "./dashboard.service";
import {
  generatePlanValidator,
  workoutSessionValidator,
  updateTodayProgressValidator,
} from "../../validators/dashboard.validator";
import {
  getUserProgress,
  logWorkoutSession,
  saveGeneratedPlan,
  upsertDailyProgress,
} from "../progress/userProgress.service";
import {
  buildFallbackWeeklyPlan,
  getLatestMealPlan,
  getTodayMealPlan,
  getWeeklyMealPlan,
  saveMealPlan,
} from "../meal-plan/mealPlan.service";
import type { IUser } from "../user/user.model";

const FALLBACK_RETRY_MS = 20 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getOnboardedUser = async (userId: string, next: any) => {
  const user = await User.findById(userId);
  if (!user) return next(new AppError("User not found", 404));
  if (!user.isCompletedOnboarding)
    return next(new AppError("Complete onboarding first", 400));
  return user;
};

/**
 * Ensures a MealPlan document exists and is fresh (≤7 days old).
 * Tries Gemini first; falls back to deterministic plan when unavailable.
 */
const ensureAndRefreshMealPlan = async (user: IUser) => {
  const userId = String(user._id);
  const latestMealPlan = await getLatestMealPlan(userId);
  const refreshDue =
    !latestMealPlan ||
    Date.now() - latestMealPlan.createdAt.getTime() >= 7 * 24 * 60 * 60 * 1000;
  const fallbackRetryDue =
    latestMealPlan?.generatedBy === "fallback" &&
    Date.now() - latestMealPlan.createdAt.getTime() >= FALLBACK_RETRY_MS;

  if (!refreshDue && !fallbackRetryDue) {
    return {
      refreshed: false,
      reason: "not_due" as const,
      source: "cached" as const,
      aiError: undefined,
    };
  }

  const nutritionProfile = computeUserNutritionProfile(user);
  const dietaryPreferences: string[] = (user as any).dietaryPreferences ?? [];
  const medicalConditions: string[] = (user as any).medicalConditions ?? [];

  if (isGeminiConfigured()) {
    try {
      const prompt = buildGeminiMealPlanPrompt(user, nutritionProfile);
      const { plan: geminiPlan, rawResponse } =
        await generateMealPlanWithGemini(prompt);

      await saveMealPlan({
        userId,
        plan: geminiPlan,
        generatedBy: "gemini",
        nutritionProfile,
        promptContext: prompt,
        rawGeminiResponse: rawResponse,
      });

      return {
        refreshed: true,
        reason: "ok" as const,
        source: "gemini" as const,
        aiError: undefined,
      };
    } catch (error) {
      const aiError =
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Gemini meal plan generation failed";

      const reason =
        error instanceof AppError && error.code === "GEMINI_QUOTA_EXCEEDED"
          ? "gemini_quota_exceeded"
          : error instanceof AppError &&
              error.code === "INVALID_GEMINI_RESPONSE"
            ? "gemini_invalid_response"
            : "gemini_error";

      const fallbackPlan = buildFallbackWeeklyPlan(
        nutritionProfile,
        dietaryPreferences,
        medicalConditions,
      );

      await saveMealPlan({
        userId,
        plan: fallbackPlan,
        generatedBy: "fallback",
        nutritionProfile,
      });

      return {
        refreshed: true,
        reason,
        source: "fallback" as const,
        aiError,
      };
    }
  }

  const fallbackPlan = buildFallbackWeeklyPlan(
    nutritionProfile,
    dietaryPreferences,
    medicalConditions,
  );

  await saveMealPlan({
    userId,
    plan: fallbackPlan,
    generatedBy: "fallback",
    nutritionProfile,
  });

  return {
    refreshed: true,
    reason: "gemini_not_configured" as const,
    source: "fallback" as const,
    aiError: undefined,
  };
};

const sendDashboardResponse = async (
  userId: string,
  res: Response,
  message: string,
  extraMeta?: Record<string, unknown>,
) => {
  const [user, progress, todayMealPlan, latestPlan] = await Promise.all([
    User.findById(userId),
    getUserProgress(userId),
    getTodayMealPlan(userId),
    getLatestMealPlan(userId),
  ]);

  if (!user) throw new AppError("User not found", 404);

  const dashboardData = buildDashboardFromState(user, progress, latestPlan);
  const mealPlanSource: string = latestPlan?.generatedBy ?? "not_generated";

  res.status(200).json({
    success: true,
    message,
    data: {
      ...dashboardData,
      todayMealPlan: todayMealPlan ?? null,
      weeklyMealPlan: latestPlan?.plan ?? null,
    },
    meta: {
      hasActivePlan: Boolean(progress?.activePlan),
      canUseGemini: isGeminiConfigured(),
      lastPlanGeneratedAt:
        latestPlan?.createdAt?.toISOString() ??
        progress?.lastPlanGeneratedAt?.toISOString(),
      mealPlanSource,
      ...extraMeta,
    },
  });
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getHomeDashboard = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const user = await getOnboardedUser(String(req.user!._id), next);
    if (!user) return;

    const userId = String(user._id);
    const progress = await getUserProgress(userId);

    if (!progress?.activePlan) {
      await saveGeneratedPlan(userId, buildPlanFromProfile(user));
    }

    const refresh = await ensureAndRefreshMealPlan(user);

    await sendDashboardResponse(
      userId,
      res,
      "Dashboard data fetched successfully",
      {
        aiWeeklyRefreshed: refresh.refreshed,
        aiSuggestionsStatus: refresh.reason,
        aiError: refresh.aiError,
      },
    );
  },
);

export const generateDashboardPlan = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const user = await getOnboardedUser(String(req.user!._id), next);
    if (!user) return;

    const parsed = generatePlanValidator.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }

    const userId = String(user._id);
    const progress = await getUserProgress(userId);

    if (progress?.activePlan && !parsed.data.force) {
      return sendDashboardResponse(
        userId,
        res,
        "Existing dashboard plan returned",
      );
    }

    const nutritionProfile = computeUserNutritionProfile(user);

    if (isGeminiConfigured()) {
      try {
        const prompt = buildGeminiMealPlanPrompt(user, nutritionProfile);
        const { plan: geminiPlan, rawResponse } =
          await generateMealPlanWithGemini(prompt);

        const profilePlan = buildPlanFromProfile(user);
        const storedPlan = mapGeminiMealPlanToUserPlan(
          geminiPlan,
          profilePlan,
          prompt,
          rawResponse,
          nutritionProfile,
        );

        await Promise.all([
          saveGeneratedPlan(userId, storedPlan),
          saveMealPlan({
            userId,
            plan: geminiPlan,
            generatedBy: "gemini",
            nutritionProfile,
            promptContext: prompt,
            rawGeminiResponse: rawResponse,
          }),
        ]);

        return sendDashboardResponse(
          userId,
          res,
          "AI meal plan generated successfully",
        );
      } catch {
        // Fall through to profile-based plan
      }
    }

    const profilePlan = buildPlanFromProfile(user);
    const fallbackMealPlan = buildFallbackWeeklyPlan(
      nutritionProfile,
      (user as any).dietaryPreferences ?? [],
      (user as any).medicalConditions ?? [],
    );

    await Promise.all([
      saveGeneratedPlan(userId, profilePlan),
      saveMealPlan({
        userId,
        plan: fallbackMealPlan,
        generatedBy: "fallback",
        nutritionProfile,
      }),
    ]);

    await sendDashboardResponse(
      userId,
      res,
      "Dashboard plan generated (offline)",
    );
  },
);

export const updateTodayDashboardProgress = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const user = await getOnboardedUser(String(req.user!._id), next);
    if (!user) return;

    const parsed = updateTodayProgressValidator.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }

    const userId = String(user._id);
    const { notes, ...actualsPatch } = parsed.data;

    try {
      const existingProgress = await getUserProgress(userId);
      if (!existingProgress?.activePlan) {
        await saveGeneratedPlan(userId, buildPlanFromProfile(user));
      }

      await upsertDailyProgress(userId, new Date(), actualsPatch, notes);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update progress";
      return next(new AppError(message, 400, "PROGRESS_UPDATE_FAILED"));
    }

    await sendDashboardResponse(
      userId,
      res,
      "Today's progress updated successfully",
    );
  },
);

export const completeWorkoutSession = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const user = await getOnboardedUser(String(req.user!._id), next);
    if (!user) return;

    const parsed = workoutSessionValidator.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"),
      );
    }

    const startedAt = parsed.data.startedAt
      ? new Date(parsed.data.startedAt)
      : new Date();
    const completedAt = parsed.data.completedAt
      ? new Date(parsed.data.completedAt)
      : new Date();

    try {
      const result = await logWorkoutSession(String(user._id), {
        dayNumber: parsed.data.dayNumber,
        dayLabel: parsed.data.dayLabel,
        workoutTitle: parsed.data.workoutTitle,
        plannedMinutes: parsed.data.plannedMinutes,
        actualMinutes: parsed.data.actualMinutes,
        caloriesBurned: parsed.data.caloriesBurned,
        startedAt,
        completedAt,
        notes: parsed.data.notes,
      });

      res.status(200).json({
        success: true,
        message: "Workout session saved successfully",
        data: result.session,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save workout session";
      return next(new AppError(message, 400, "WORKOUT_SESSION_SAVE_FAILED"));
    }
  },
);

export const getTodayMealPlanHandler = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const userId = String(req.user!._id);
    const todayPlan = await getTodayMealPlan(userId);

    if (!todayPlan) {
      return next(new AppError("No meal plan found for today", 404));
    }

    res.status(200).json({
      success: true,
      message: "Today's meal plan fetched successfully",
      data: todayPlan,
    });
  },
);

export const getWeeklyMealPlanHandler = asyncHandler(
  async (req: Request, res: Response, next: any) => {
    const userId = String(req.user!._id);
    const weeklyPlan = await getWeeklyMealPlan(userId);

    if (!weeklyPlan) {
      return next(new AppError("No weekly meal plan found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Weekly meal plan fetched successfully",
      data: weeklyPlan,
    });
  },
);
