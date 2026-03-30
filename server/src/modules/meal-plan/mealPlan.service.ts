import mongoose from "mongoose";
import MealPlan from "./mealPlan.model";
import type { IMealPlan, PlanDay, WeeklyMealPlan } from "./mealPlan.model";
import type { NutritionProfile } from "../../utils/nutrition.calculator";

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// ─── Save a (re)generated meal plan ──────────────────────────────────────────

export interface SaveMealPlanInput {
  userId: mongoose.Types.ObjectId | string;
  plan: WeeklyMealPlan;
  generatedBy: "gemini" | "fallback";
  nutritionProfile: NutritionProfile;
  promptContext?: string;
  rawGeminiResponse?: string;
}

export async function saveMealPlan(
  input: SaveMealPlanInput,
): Promise<IMealPlan> {
  // weekStartDate = last Monday (ISO week start)
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const doc = await MealPlan.create({
    user: input.userId,
    weekStartDate: weekStart,
    plan: input.plan,
    generatedBy: input.generatedBy,
    nutritionProfile: input.nutritionProfile,
    promptContext: input.promptContext,
    rawGeminiResponse: input.rawGeminiResponse,
  });

  return doc;
}

// ─── Get the most recently generated meal plan for a user ─────────────────────

export async function getLatestMealPlan(
  userId: mongoose.Types.ObjectId | string,
): Promise<IMealPlan | null> {
  return MealPlan.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
}

// ─── Get the full weekly plan or null ─────────────────────────────────────────

export async function getWeeklyMealPlan(
  userId: mongoose.Types.ObjectId | string,
): Promise<IMealPlan | null> {
  return getLatestMealPlan(userId);
}

// ─── Slice out today's day plan ───────────────────────────────────────────────

/**
 * Returns the PlanDay for today from the most recent meal plan.
 * "Today" maps to day index based on the plan's weekStartDate so that
 * Monday of that week = day 1, Sunday = day 7.
 */
export async function getTodayMealPlan(
  userId: mongoose.Types.ObjectId | string,
): Promise<{
  day: PlanDay;
  mealPlanId: string;
  generatedBy: "gemini" | "fallback";
} | null> {
  const mealPlan = await getLatestMealPlan(userId);
  if (!mealPlan) return null;

  const today = new Date();
  const weekStart = new Date(mealPlan.weekStartDate);

  // How many days since the week started (0 = Monday of that week)
  const msSinceStart = today.getTime() - weekStart.getTime();
  const daysSinceStart = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));

  // If the plan is more than 7 days old it's a stale plan; return day 7 as fallback
  const dayIndex = Math.min(Math.max(daysSinceStart, 0), 6);
  const targetDayNumber = dayIndex + 1; // 1-7

  const day =
    mealPlan.plan.days.find((d) => d.dayNumber === targetDayNumber) ??
    mealPlan.plan.days[dayIndex] ??
    mealPlan.plan.days[0];

  if (!day) return null;

  return {
    day,
    mealPlanId: String(mealPlan._id),
    generatedBy: mealPlan.generatedBy,
  };
}

// ─── Check if a weekly refresh is due ─────────────────────────────────────────

const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

export async function isMealPlanRefreshDue(
  userId: mongoose.Types.ObjectId | string,
): Promise<boolean> {
  const latest = await getLatestMealPlan(userId);
  if (!latest) return true;
  return Date.now() - latest.createdAt.getTime() >= WEEKLY_REFRESH_MS;
}

// ─── Build a deterministic fallback plan ─────────────────────────────────────
// Used when Gemini is unavailable. Each day gets simple, safe Indian meal
// options that respect dietary preferences and cover the macro targets.

export function buildFallbackWeeklyPlan(
  nutritionProfile: NutritionProfile,
  dietaryPreferences: string[],
  medicalConditions: string[],
): WeeklyMealPlan {
  const { dailyCalorieTarget, macros } = nutritionProfile;
  const isVeg = dietaryPreferences.some((p) =>
    ["vegetarian", "vegan"].includes(p),
  );
  const isVegan = dietaryPreferences.some((p) => p === "vegan");
  const isDairyFree =
    isVegan ||
    dietaryPreferences.some((p) => p === "dairy_free") ||
    medicalConditions.some((c) => /lactose/i.test(c));

  const breakfastOptions = isVegan
    ? [
        {
          name: "Oats with soy milk and banana",
          ingredients: [
            { item: "Rolled oats", quantity: "80g" },
            { item: "Soy milk", quantity: "200ml" },
            { item: "Banana", quantity: "1 medium" },
            { item: "Chia seeds", quantity: "10g" },
          ],
          macros: {
            calories: Math.round(dailyCalorieTarget * 0.22),
            protein: Math.round(macros.protein * 0.2),
            carbs: Math.round(macros.carbs * 0.25),
            fat: Math.round(macros.fat * 0.18),
          },
          dietaryTags: ["vegan", "dairy_free", "high_fiber"],
          prepNote: "Soak oats overnight for easier digestion.",
        },
      ]
    : isDairyFree
      ? [
          {
            name: "Poha with peanuts",
            ingredients: [
              { item: "Beaten rice (poha)", quantity: "80g dry" },
              { item: "Roasted peanuts", quantity: "30g" },
              { item: "Green peas", quantity: "50g" },
              { item: "Mustard seeds & curry leaves", quantity: "to taste" },
            ],
            macros: {
              calories: Math.round(dailyCalorieTarget * 0.22),
              protein: Math.round(macros.protein * 0.18),
              carbs: Math.round(macros.carbs * 0.25),
              fat: Math.round(macros.fat * 0.18),
            },
            dietaryTags: ["vegetarian", "dairy_free", "gluten_free"],
            prepNote: "Rinse poha well and drain before cooking.",
          },
        ]
      : [
          {
            name: isVeg ? "Paneer paratha with curd" : "Egg paratha with curd",
            ingredients: isVeg
              ? [
                  { item: "Whole wheat paratha", quantity: "2 medium (120g)" },
                  { item: "Paneer (cottage cheese)", quantity: "80g" },
                  { item: "Low-fat curd", quantity: "100g" },
                ]
              : [
                  { item: "Whole wheat paratha", quantity: "2 medium (120g)" },
                  { item: "Egg (boiled or scrambled)", quantity: "2 large" },
                  { item: "Low-fat curd", quantity: "100g" },
                ],
            macros: {
              calories: Math.round(dailyCalorieTarget * 0.22),
              protein: Math.round(macros.protein * 0.22),
              carbs: Math.round(macros.carbs * 0.25),
              fat: Math.round(macros.fat * 0.2),
            },
            dietaryTags: isVeg
              ? ["vegetarian", "high_protein"]
              : ["high_protein"],
            prepNote: "Use minimal ghee when making the paratha.",
          },
        ];

  const lunchProteinSource = isVegan
    ? "Rajma (kidney beans)"
    : isVeg
      ? "Paneer / Dal"
      : "Chicken / Dal";

  const days: PlanDay[] = DAY_LABELS.map((label, i) => ({
    dayNumber: i + 1,
    dayLabel: label,
    dailyTargets: {
      calories: dailyCalorieTarget,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    },
    meals: [
      {
        mealType: "breakfast" as const,
        timingNote: "Eat within 1 hour of waking up.",
        targetMacros: {
          calories: Math.round(dailyCalorieTarget * 0.22),
          protein: Math.round(macros.protein * 0.2),
          carbs: Math.round(macros.carbs * 0.25),
          fat: Math.round(macros.fat * 0.18),
        },
        options: breakfastOptions,
      },
      {
        mealType: "mid_morning" as const,
        timingNote: "Have this mid-morning, around 10–11 AM.",
        targetMacros: {
          calories: Math.round(dailyCalorieTarget * 0.1),
          protein: Math.round(macros.protein * 0.1),
          carbs: Math.round(macros.carbs * 0.12),
          fat: Math.round(macros.fat * 0.08),
        },
        options: [
          {
            name: "Seasonal fruit + handful of nuts",
            ingredients: [
              {
                item: "Mixed fruit (apple, guava, or papaya)",
                quantity: "150g",
              },
              {
                item: isDairyFree ? "Almonds or walnuts" : "Almonds",
                quantity: "15g",
              },
            ],
            macros: {
              calories: Math.round(dailyCalorieTarget * 0.1),
              protein: Math.round(macros.protein * 0.08),
              carbs: Math.round(macros.carbs * 0.12),
              fat: Math.round(macros.fat * 0.08),
            },
            dietaryTags: [isVegan ? "vegan" : "vegetarian", "high_fiber"],
          },
        ],
      },
      {
        mealType: "lunch" as const,
        timingNote: "Eat lunch between 12:30 PM and 2 PM.",
        targetMacros: {
          calories: Math.round(dailyCalorieTarget * 0.3),
          protein: Math.round(macros.protein * 0.3),
          carbs: Math.round(macros.carbs * 0.32),
          fat: Math.round(macros.fat * 0.28),
        },
        options: [
          {
            name: `${lunchProteinSource} + rice + sabzi + salad`,
            ingredients: [
              { item: "Cooked rice or 2 rotis", quantity: "1 cup / 150g" },
              {
                item: isVegan
                  ? "Rajma or chana curry"
                  : isVeg
                    ? "Dal or paneer sabzi"
                    : "Dal or grilled chicken",
                quantity: "1 bowl (150g)",
              },
              { item: "Mixed vegetable sabzi", quantity: "100g" },
              { item: "Cucumber + tomato salad", quantity: "100g" },
            ],
            macros: {
              calories: Math.round(dailyCalorieTarget * 0.3),
              protein: Math.round(macros.protein * 0.3),
              carbs: Math.round(macros.carbs * 0.32),
              fat: Math.round(macros.fat * 0.28),
            },
            dietaryTags: [
              isVegan ? "vegan" : isVeg ? "vegetarian" : "high_protein",
            ],
            prepNote:
              "Use minimal oil; prefer steamed or pressure-cooked dal/rajma.",
          },
        ],
      },
      {
        mealType: "dinner" as const,
        timingNote: "Have dinner at least 2 hours before bedtime.",
        targetMacros: {
          calories: Math.round(dailyCalorieTarget * 0.28),
          protein: Math.round(macros.protein * 0.28),
          carbs: Math.round(macros.carbs * 0.2),
          fat: Math.round(macros.fat * 0.3),
        },
        options: [
          {
            name: "Light dal khichdi with papad",
            ingredients: [
              { item: "Moong dal + rice khichdi", quantity: "1.5 cups cooked" },
              { item: "Roasted papad", quantity: "2 pieces" },
              {
                item: isDairyFree ? "" : "Low-fat curd",
                quantity: isDairyFree ? "" : "100g",
              },
            ].filter((i) => i.item),
            macros: {
              calories: Math.round(dailyCalorieTarget * 0.28),
              protein: Math.round(macros.protein * 0.28),
              carbs: Math.round(macros.carbs * 0.2),
              fat: Math.round(macros.fat * 0.3),
            },
            dietaryTags: [
              isVegan ? "vegan" : "vegetarian",
              "light",
              "easy_digest",
            ],
            prepNote:
              "Keep dinner lighter than lunch. Add turmeric and ginger for digestion.",
          },
        ],
      },
    ],
    workoutNote:
      "Complete your planned workout session today and log your activity.",
    habitNote:
      "Drink a glass of water as soon as you wake up. Aim to reach your step goal before evening.",
  }));

  return {
    weekSummary:
      "This is a starter meal plan based on your onboarding profile. Weekly AI-powered suggestions will be available once Gemini is configured.",
    days,
  };
}
