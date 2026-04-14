"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeklyMealPlanHandler = exports.getTodayMealPlanHandler = exports.completeWorkoutSession = exports.updateTodayDashboardProgress = exports.generateDashboardPlan = exports.getHomeDashboard = void 0;
const appError_1 = __importDefault(require("../../utils/appError"));
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const user_model_1 = __importDefault(require("../user/user.model"));
const gemini_service_1 = require("../../services/ai/gemini.service");
const dashboard_service_1 = require("./dashboard.service");
const dashboard_validator_1 = require("../../validators/dashboard.validator");
const userProgress_service_1 = require("../progress/userProgress.service");
const mealPlan_service_1 = require("../meal-plan/mealPlan.service");
const FALLBACK_RETRY_MS = 20 * 1000;
// ─── Helpers ──────────────────────────────────────────────────────────────────
const getOnboardedUser = async (userId, next) => {
    const user = await user_model_1.default.findById(userId);
    if (!user)
        return next(new appError_1.default("User not found", 404));
    if (!user.isCompletedOnboarding)
        return next(new appError_1.default("Complete onboarding first", 400));
    return user;
};
/**
 * Ensures a MealPlan document exists and is fresh (≤7 days old).
 * Tries Gemini first; falls back to deterministic plan when unavailable.
 */
const ensureAndRefreshMealPlan = async (user) => {
    const userId = String(user._id);
    const latestMealPlan = await (0, mealPlan_service_1.getLatestMealPlan)(userId);
    const refreshDue = !latestMealPlan ||
        Date.now() - latestMealPlan.createdAt.getTime() >= 7 * 24 * 60 * 60 * 1000;
    const fallbackRetryDue = latestMealPlan?.generatedBy === "fallback" &&
        Date.now() - latestMealPlan.createdAt.getTime() >= FALLBACK_RETRY_MS;
    if (!refreshDue && !fallbackRetryDue) {
        return {
            refreshed: false,
            reason: "not_due",
            source: "cached",
            aiError: undefined,
        };
    }
    const nutritionProfile = (0, dashboard_service_1.computeUserNutritionProfile)(user);
    const dietaryPreferences = user.dietaryPreferences ?? [];
    const medicalConditions = user.medicalConditions ?? [];
    if ((0, gemini_service_1.isGeminiConfigured)()) {
        try {
            const prompt = (0, dashboard_service_1.buildGeminiMealPlanPrompt)(user, nutritionProfile);
            const { plan: geminiPlan, rawResponse } = await (0, gemini_service_1.generateMealPlanWithGemini)(prompt);
            await (0, mealPlan_service_1.saveMealPlan)({
                userId,
                plan: geminiPlan,
                generatedBy: "gemini",
                nutritionProfile,
                promptContext: prompt,
                rawGeminiResponse: rawResponse,
            });
            return {
                refreshed: true,
                reason: "ok",
                source: "gemini",
                aiError: undefined,
            };
        }
        catch (error) {
            const aiError = error instanceof appError_1.default
                ? error.message
                : error instanceof Error
                    ? error.message
                    : "Gemini meal plan generation failed";
            const reason = error instanceof appError_1.default && error.code === "GEMINI_QUOTA_EXCEEDED"
                ? "gemini_quota_exceeded"
                : error instanceof appError_1.default &&
                    error.code === "INVALID_GEMINI_RESPONSE"
                    ? "gemini_invalid_response"
                    : "gemini_error";
            const fallbackPlan = (0, mealPlan_service_1.buildFallbackWeeklyPlan)(nutritionProfile, dietaryPreferences, medicalConditions);
            await (0, mealPlan_service_1.saveMealPlan)({
                userId,
                plan: fallbackPlan,
                generatedBy: "fallback",
                nutritionProfile,
            });
            return {
                refreshed: true,
                reason,
                source: "fallback",
                aiError,
            };
        }
    }
    const fallbackPlan = (0, mealPlan_service_1.buildFallbackWeeklyPlan)(nutritionProfile, dietaryPreferences, medicalConditions);
    await (0, mealPlan_service_1.saveMealPlan)({
        userId,
        plan: fallbackPlan,
        generatedBy: "fallback",
        nutritionProfile,
    });
    return {
        refreshed: true,
        reason: "gemini_not_configured",
        source: "fallback",
        aiError: undefined,
    };
};
const sendDashboardResponse = async (userId, res, message, extraMeta) => {
    const [user, progress, todayMealPlan, latestPlan] = await Promise.all([
        user_model_1.default.findById(userId),
        (0, userProgress_service_1.getUserProgress)(userId),
        (0, mealPlan_service_1.getTodayMealPlan)(userId),
        (0, mealPlan_service_1.getLatestMealPlan)(userId),
    ]);
    if (!user)
        throw new appError_1.default("User not found", 404);
    const dashboardData = (0, dashboard_service_1.buildDashboardFromState)(user, progress, latestPlan);
    const mealPlanSource = latestPlan?.generatedBy ?? "not_generated";
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
            canUseGemini: (0, gemini_service_1.isGeminiConfigured)(),
            lastPlanGeneratedAt: latestPlan?.createdAt?.toISOString() ??
                progress?.lastPlanGeneratedAt?.toISOString(),
            mealPlanSource,
            ...extraMeta,
        },
    });
};
// ─── Handlers ─────────────────────────────────────────────────────────────────
exports.getHomeDashboard = (0, asyncHandler_1.default)(async (req, res, next) => {
    const user = await getOnboardedUser(String(req.user._id), next);
    if (!user)
        return;
    const userId = String(user._id);
    const progress = await (0, userProgress_service_1.getUserProgress)(userId);
    if (!progress?.activePlan) {
        await (0, userProgress_service_1.saveGeneratedPlan)(userId, (0, dashboard_service_1.buildPlanFromProfile)(user));
    }
    const refresh = await ensureAndRefreshMealPlan(user);
    await sendDashboardResponse(userId, res, "Dashboard data fetched successfully", {
        aiWeeklyRefreshed: refresh.refreshed,
        aiSuggestionsStatus: refresh.reason,
        aiError: refresh.aiError,
    });
});
exports.generateDashboardPlan = (0, asyncHandler_1.default)(async (req, res, next) => {
    const user = await getOnboardedUser(String(req.user._id), next);
    if (!user)
        return;
    const parsed = dashboard_validator_1.generatePlanValidator.safeParse(req.body ?? {});
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const userId = String(user._id);
    const progress = await (0, userProgress_service_1.getUserProgress)(userId);
    if (progress?.activePlan && !parsed.data.force) {
        return sendDashboardResponse(userId, res, "Existing dashboard plan returned");
    }
    const nutritionProfile = (0, dashboard_service_1.computeUserNutritionProfile)(user);
    if ((0, gemini_service_1.isGeminiConfigured)()) {
        try {
            const prompt = (0, dashboard_service_1.buildGeminiMealPlanPrompt)(user, nutritionProfile);
            const { plan: geminiPlan, rawResponse } = await (0, gemini_service_1.generateMealPlanWithGemini)(prompt);
            const profilePlan = (0, dashboard_service_1.buildPlanFromProfile)(user);
            const storedPlan = (0, dashboard_service_1.mapGeminiMealPlanToUserPlan)(geminiPlan, profilePlan, prompt, rawResponse, nutritionProfile);
            await Promise.all([
                (0, userProgress_service_1.saveGeneratedPlan)(userId, storedPlan),
                (0, mealPlan_service_1.saveMealPlan)({
                    userId,
                    plan: geminiPlan,
                    generatedBy: "gemini",
                    nutritionProfile,
                    promptContext: prompt,
                    rawGeminiResponse: rawResponse,
                }),
            ]);
            return sendDashboardResponse(userId, res, "AI meal plan generated successfully");
        }
        catch {
            // Fall through to profile-based plan
        }
    }
    const profilePlan = (0, dashboard_service_1.buildPlanFromProfile)(user);
    const fallbackMealPlan = (0, mealPlan_service_1.buildFallbackWeeklyPlan)(nutritionProfile, user.dietaryPreferences ?? [], user.medicalConditions ?? []);
    await Promise.all([
        (0, userProgress_service_1.saveGeneratedPlan)(userId, profilePlan),
        (0, mealPlan_service_1.saveMealPlan)({
            userId,
            plan: fallbackMealPlan,
            generatedBy: "fallback",
            nutritionProfile,
        }),
    ]);
    await sendDashboardResponse(userId, res, "Dashboard plan generated (offline)");
});
exports.updateTodayDashboardProgress = (0, asyncHandler_1.default)(async (req, res, next) => {
    const user = await getOnboardedUser(String(req.user._id), next);
    if (!user)
        return;
    const parsed = dashboard_validator_1.updateTodayProgressValidator.safeParse(req.body ?? {});
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const userId = String(user._id);
    const { notes, ...actualsPatch } = parsed.data;
    try {
        const existingProgress = await (0, userProgress_service_1.getUserProgress)(userId);
        if (!existingProgress?.activePlan) {
            await (0, userProgress_service_1.saveGeneratedPlan)(userId, (0, dashboard_service_1.buildPlanFromProfile)(user));
        }
        await (0, userProgress_service_1.upsertDailyProgress)(userId, new Date(), actualsPatch, notes);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update progress";
        return next(new appError_1.default(message, 400, "PROGRESS_UPDATE_FAILED"));
    }
    await sendDashboardResponse(userId, res, "Today's progress updated successfully");
});
exports.completeWorkoutSession = (0, asyncHandler_1.default)(async (req, res, next) => {
    const user = await getOnboardedUser(String(req.user._id), next);
    if (!user)
        return;
    const parsed = dashboard_validator_1.workoutSessionValidator.safeParse(req.body ?? {});
    if (!parsed.success) {
        return next(new appError_1.default(parsed.error.issues[0].message, 400, "VALIDATION_ERROR"));
    }
    const startedAt = parsed.data.startedAt
        ? new Date(parsed.data.startedAt)
        : new Date();
    const completedAt = parsed.data.completedAt
        ? new Date(parsed.data.completedAt)
        : new Date();
    try {
        const result = await (0, userProgress_service_1.logWorkoutSession)(String(user._id), {
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
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Failed to save workout session";
        return next(new appError_1.default(message, 400, "WORKOUT_SESSION_SAVE_FAILED"));
    }
});
exports.getTodayMealPlanHandler = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = String(req.user._id);
    const todayPlan = await (0, mealPlan_service_1.getTodayMealPlan)(userId);
    if (!todayPlan) {
        return next(new appError_1.default("No meal plan found for today", 404));
    }
    res.status(200).json({
        success: true,
        message: "Today's meal plan fetched successfully",
        data: todayPlan,
    });
});
exports.getWeeklyMealPlanHandler = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = String(req.user._id);
    const weeklyPlan = await (0, mealPlan_service_1.getWeeklyMealPlan)(userId);
    if (!weeklyPlan) {
        return next(new appError_1.default("No weekly meal plan found", 404));
    }
    res.status(200).json({
        success: true,
        message: "Weekly meal plan fetched successfully",
        data: weeklyPlan,
    });
});
