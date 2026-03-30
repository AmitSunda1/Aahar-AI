"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProgress = exports.upsertDailyProgress = exports.saveGeneratedPlan = void 0;
const userProgress_model_1 = __importDefault(require("./userProgress.model"));
const toDateKey = (date) => date.toISOString().slice(0, 10);
const calculateAdherenceScore = (targets, actuals) => {
    const checks = [];
    const nutritionChecks = [
        [actuals.caloriesConsumed, targets.nutrition.calories],
        [actuals.carbsConsumed, targets.nutrition.carbs],
        [actuals.proteinConsumed, targets.nutrition.protein],
        [actuals.fatConsumed, targets.nutrition.fat],
    ];
    nutritionChecks.forEach(([actual, target]) => {
        if (target > 0)
            checks.push(Math.min(1, actual / target));
    });
    if (targets.nutrition.waterMl && targets.nutrition.waterMl > 0) {
        checks.push(Math.min(1, actuals.waterMlConsumed / targets.nutrition.waterMl));
    }
    if (targets.activity.steps > 0) {
        checks.push(Math.min(1, actuals.stepsCompleted / targets.activity.steps));
    }
    if (targets.activity.exerciseMinutes > 0) {
        checks.push(Math.min(1, actuals.exerciseMinutesCompleted / targets.activity.exerciseMinutes));
    }
    if (checks.length === 0)
        return 0;
    const avg = checks.reduce((sum, value) => sum + value, 0) / checks.length;
    return Math.round(avg * 100);
};
const deriveStatus = (adherenceScore, actuals) => {
    const hasAnyProgress = Object.values(actuals).some((value) => typeof value === "number" && value > 0);
    if (!hasAnyProgress)
        return "not_started";
    if (adherenceScore >= 100)
        return "completed";
    return "in_progress";
};
const saveGeneratedPlan = async (userId, plan) => {
    const existing = await userProgress_model_1.default.findOne({ user: userId });
    const nextVersion = plan.version ?? (existing?.activePlan?.version ?? 0) + 1;
    const generatedAt = plan.generatedAt ?? new Date();
    const normalizedPlan = {
        ...plan,
        version: nextVersion,
        generatedAt,
    };
    const progress = existing ??
        new userProgress_model_1.default({
            user: userId,
            planHistory: [],
            dailyProgress: [],
        });
    if (progress.activePlan) {
        progress.planHistory.push(progress.activePlan);
    }
    progress.activePlan = normalizedPlan;
    progress.lastPlanGeneratedAt = generatedAt;
    await progress.save();
    return progress;
};
exports.saveGeneratedPlan = saveGeneratedPlan;
const upsertDailyProgress = async (userId, date, actualsPatch, notes) => {
    const progress = await userProgress_model_1.default.findOne({ user: userId });
    if (!progress?.activePlan) {
        throw new Error("No active plan found for user progress");
    }
    const dateKey = toDateKey(date);
    const targets = {
        nutrition: progress.activePlan.nutrition,
        activity: progress.activePlan.activity,
    };
    const defaults = {
        caloriesConsumed: 0,
        carbsConsumed: 0,
        proteinConsumed: 0,
        fatConsumed: 0,
        waterMlConsumed: 0,
        stepsCompleted: 0,
        exerciseMinutesCompleted: 0,
        caloriesBurned: 0,
    };
    const existingIndex = progress.dailyProgress.findIndex((entry) => entry.dateKey === dateKey);
    const previousActuals = existingIndex >= 0
        ? progress.dailyProgress[existingIndex].actuals
        : defaults;
    const mergedActuals = {
        ...defaults,
        ...previousActuals,
        ...actualsPatch,
    };
    const adherenceScore = calculateAdherenceScore(targets, mergedActuals);
    const status = deriveStatus(adherenceScore, mergedActuals);
    const nextEntry = {
        date,
        dateKey,
        targets,
        actuals: mergedActuals,
        adherenceScore,
        status,
        notes,
        completedAt: status === "completed" ? new Date() : undefined,
    };
    if (existingIndex >= 0) {
        progress.dailyProgress[existingIndex] = nextEntry;
    }
    else {
        progress.dailyProgress.push(nextEntry);
    }
    progress.lastProgressUpdatedAt = new Date();
    await progress.save();
    return nextEntry;
};
exports.upsertDailyProgress = upsertDailyProgress;
const getUserProgress = async (userId) => {
    return userProgress_model_1.default.findOne({ user: userId });
};
exports.getUserProgress = getUserProgress;
