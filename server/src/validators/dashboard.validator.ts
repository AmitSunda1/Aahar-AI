import { z } from "zod";

// ─── Existing validators (unchanged) ────────────────────────────────────────

export const generatePlanValidator = z.object({
  force: z.boolean().optional().default(true),
});

export const updateTodayProgressValidator = z
  .object({
    caloriesConsumed: z.number().min(0).optional(),
    carbsConsumed: z.number().min(0).optional(),
    proteinConsumed: z.number().min(0).optional(),
    fatConsumed: z.number().min(0).optional(),
    waterMlConsumed: z.number().min(0).optional(),
    stepsCompleted: z.number().min(0).optional(),
    exerciseMinutesCompleted: z.number().min(0).optional(),
    caloriesBurned: z.number().min(0).optional(),
    weightKg: z.number().min(0).optional(),
    notes: z.array(z.string().trim().min(1)).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one progress field is required",
  });

// Legacy — kept for backward-compat with generatePlanWithGemini
export const geminiPlanResponseValidator = z.object({
  summary: z.string().trim().min(20).max(280),
  recommendations: z.object({
    meals: z.array(z.string().trim().min(3)).length(7),
    workouts: z.array(z.string().trim().min(3)).length(7),
    habits: z.array(z.string().trim().min(3)).length(7),
  }),
});

// ─── Weekly Meal Plan validator (new) ────────────────────────────────────────

const ingredientValidator = z.object({
  item: z.string().trim().min(1),
  quantity: z.string().trim().min(1),
});

const mealMacrosValidator = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});

const mealOptionValidator = z.object({
  name: z.string().trim().min(2),
  ingredients: z.array(ingredientValidator).min(1),
  macros: mealMacrosValidator,
  dietaryTags: z.array(z.string().trim()).default([]),
  prepNote: z.string().trim().optional(),
});

const mealTypeEnum = z.enum([
  "breakfast",
  "mid_morning",
  "lunch",
  "pre_workout",
  "post_workout",
  "dinner",
  "evening_snack",
]);

const dayMealValidator = z.object({
  mealType: mealTypeEnum,
  timingNote: z.string().trim().min(5),
  targetMacros: mealMacrosValidator,
  options: z.array(mealOptionValidator).min(1).max(4),
});

const planDayValidator = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayLabel: z.string().trim().min(2),
  dailyTargets: mealMacrosValidator,
  meals: z.array(dayMealValidator).min(3),
  workoutNote: z.string().trim().min(5),
  habitNote: z.string().trim().min(5),
});

export const geminiMealPlanValidator = z.object({
  weekSummary: z.string().trim().min(20).max(500),
  days: z.array(planDayValidator).length(7),
});

export type GeneratePlanInput = z.infer<typeof generatePlanValidator>;
export type UpdateTodayProgressInput = z.infer<
  typeof updateTodayProgressValidator
>;
export type GeminiPlanResponse = z.infer<typeof geminiPlanResponseValidator>;
export type GeminiMealPlanResponse = z.infer<typeof geminiMealPlanValidator>;
