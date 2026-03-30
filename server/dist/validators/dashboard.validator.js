"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiMealPlanValidator = exports.geminiPlanResponseValidator = exports.updateTodayProgressValidator = exports.generatePlanValidator = void 0;
const zod_1 = require("zod");
// ─── Existing validators (unchanged) ────────────────────────────────────────
exports.generatePlanValidator = zod_1.z.object({
    force: zod_1.z.boolean().optional().default(true),
});
exports.updateTodayProgressValidator = zod_1.z
    .object({
    caloriesConsumed: zod_1.z.number().min(0).optional(),
    carbsConsumed: zod_1.z.number().min(0).optional(),
    proteinConsumed: zod_1.z.number().min(0).optional(),
    fatConsumed: zod_1.z.number().min(0).optional(),
    waterMlConsumed: zod_1.z.number().min(0).optional(),
    stepsCompleted: zod_1.z.number().min(0).optional(),
    exerciseMinutesCompleted: zod_1.z.number().min(0).optional(),
    caloriesBurned: zod_1.z.number().min(0).optional(),
    weightKg: zod_1.z.number().min(0).optional(),
    notes: zod_1.z.array(zod_1.z.string().trim().min(1)).max(10).optional(),
})
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one progress field is required",
});
// Legacy — kept for backward-compat with generatePlanWithGemini
exports.geminiPlanResponseValidator = zod_1.z.object({
    summary: zod_1.z.string().trim().min(20).max(280),
    recommendations: zod_1.z.object({
        meals: zod_1.z.array(zod_1.z.string().trim().min(3)).length(7),
        workouts: zod_1.z.array(zod_1.z.string().trim().min(3)).length(7),
        habits: zod_1.z.array(zod_1.z.string().trim().min(3)).length(7),
    }),
});
// ─── Weekly Meal Plan validator (new) ────────────────────────────────────────
const ingredientValidator = zod_1.z.object({
    item: zod_1.z.string().trim().min(1),
    quantity: zod_1.z.string().trim().min(1),
});
const mealMacrosValidator = zod_1.z.object({
    calories: zod_1.z.number().min(0),
    protein: zod_1.z.number().min(0),
    carbs: zod_1.z.number().min(0),
    fat: zod_1.z.number().min(0),
});
const mealOptionValidator = zod_1.z.object({
    name: zod_1.z.string().trim().min(2),
    ingredients: zod_1.z.array(ingredientValidator).min(1),
    macros: mealMacrosValidator,
    dietaryTags: zod_1.z.array(zod_1.z.string().trim()).default([]),
    prepNote: zod_1.z.string().trim().optional(),
});
const mealTypeEnum = zod_1.z.enum([
    "breakfast",
    "mid_morning",
    "lunch",
    "pre_workout",
    "post_workout",
    "dinner",
    "evening_snack",
]);
const dayMealValidator = zod_1.z.object({
    mealType: mealTypeEnum,
    timingNote: zod_1.z.string().trim().min(5),
    targetMacros: mealMacrosValidator,
    options: zod_1.z.array(mealOptionValidator).min(1).max(4),
});
const planDayValidator = zod_1.z.object({
    dayNumber: zod_1.z.number().int().min(1).max(7),
    dayLabel: zod_1.z.string().trim().min(2),
    dailyTargets: mealMacrosValidator,
    meals: zod_1.z.array(dayMealValidator).min(3),
    workoutNote: zod_1.z.string().trim().min(5),
    habitNote: zod_1.z.string().trim().min(5),
});
exports.geminiMealPlanValidator = zod_1.z.object({
    weekSummary: zod_1.z.string().trim().min(20).max(500),
    days: zod_1.z.array(planDayValidator).length(7),
});
