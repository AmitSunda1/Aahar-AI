import mongoose, { Document, Schema } from "mongoose";
import type { NutritionProfile } from "../../utils/nutrition.calculator";

// ─── Ingredient ───────────────────────────────────────────────────────────────

export interface Ingredient {
  item: string;
  quantity: string; // e.g. "150g", "2 pieces", "1 cup"
}

// ─── Per-meal macro snapshot ──────────────────────────────────────────────────

export interface MealMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ─── A single meal option (one of 2-3 alternatives per meal slot) ─────────────

export interface MealOption {
  name: string;
  ingredients: Ingredient[];
  macros: MealMacros;
  /** e.g. ["vegetarian", "high_protein", "dairy_free"] */
  dietaryTags: string[];
  /** Optional short cooking or prep instruction */
  prepNote?: string;
}

// ─── A meal slot within a day ─────────────────────────────────────────────────

export type MealType =
  | "breakfast"
  | "mid_morning"
  | "lunch"
  | "pre_workout"
  | "post_workout"
  | "dinner"
  | "evening_snack";

export interface DayMeal {
  mealType: MealType;
  /** e.g. "Have this at least 1 hour before your workout" */
  timingNote: string;
  targetMacros: MealMacros;
  options: MealOption[];
}

// ─── A single day in the 7-day plan ──────────────────────────────────────────

export interface PlanDay {
  dayNumber: number; // 1-7
  dayLabel: string; // "Monday" … "Sunday"
  dailyTargets: MealMacros; // full-day macro targets for quick reference
  meals: DayMeal[];
  workoutNote: string;
  habitNote: string;
}

// ─── The full weekly plan from Gemini ─────────────────────────────────────────

export interface WeeklyMealPlan {
  weekSummary: string;
  days: PlanDay[];
}

// ─── Mongoose document ────────────────────────────────────────────────────────

export interface IMealPlan extends Document {
  user: mongoose.Types.ObjectId;
  weekStartDate: Date;
  plan: WeeklyMealPlan;
  generatedBy: "gemini" | "fallback";
  nutritionProfile: NutritionProfile;
  promptContext?: string;
  rawGeminiResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const ingredientSchema = new Schema<Ingredient>(
  {
    item: { type: String, required: true },
    quantity: { type: String, required: true },
  },
  { _id: false },
);

const mealMacrosSchema = new Schema<MealMacros>(
  {
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const mealOptionSchema = new Schema<MealOption>(
  {
    name: { type: String, required: true },
    ingredients: { type: [ingredientSchema], required: true },
    macros: { type: mealMacrosSchema, required: true },
    dietaryTags: { type: [String], default: [] },
    prepNote: { type: String },
  },
  { _id: false },
);

const dayMealSchema = new Schema<DayMeal>(
  {
    mealType: {
      type: String,
      enum: [
        "breakfast",
        "mid_morning",
        "lunch",
        "pre_workout",
        "post_workout",
        "dinner",
        "evening_snack",
      ],
      required: true,
    },
    timingNote: { type: String, required: true },
    targetMacros: { type: mealMacrosSchema, required: true },
    options: { type: [mealOptionSchema], required: true },
  },
  { _id: false },
);

const planDaySchema = new Schema<PlanDay>(
  {
    dayNumber: { type: Number, required: true, min: 1, max: 7 },
    dayLabel: { type: String, required: true },
    dailyTargets: { type: mealMacrosSchema, required: true },
    meals: { type: [dayMealSchema], required: true },
    workoutNote: { type: String, required: true },
    habitNote: { type: String, required: true },
  },
  { _id: false },
);

const weeklyMealPlanSchema = new Schema<WeeklyMealPlan>(
  {
    weekSummary: { type: String, required: true },
    days: { type: [planDaySchema], required: true },
  },
  { _id: false },
);

// NutritionProfile is stored as a plain Mixed document snapshot
const mealPlanSchema = new Schema<IMealPlan>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekStartDate: { type: Date, required: true },
    plan: { type: weeklyMealPlanSchema, required: true },
    generatedBy: { type: String, enum: ["gemini", "fallback"], required: true },
    nutritionProfile: { type: Schema.Types.Mixed, required: true },
    promptContext: { type: String },
    rawGeminiResponse: { type: String },
  },
  { timestamps: true },
);

// Latest-plan-per-user lookup
mealPlanSchema.index({ user: 1, createdAt: -1 });

const MealPlan = mongoose.model<IMealPlan>("MealPlan", mealPlanSchema);
export default MealPlan;
