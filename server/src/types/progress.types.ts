import type { NutritionProfile } from "../utils/nutrition.calculator";

export const PLAN_SOURCES = ["mock", "gemini", "manual"] as const;
export type PlanSource = (typeof PLAN_SOURCES)[number];

export const DAILY_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "missed",
] as const;
export type DailyProgressStatus = (typeof DAILY_PROGRESS_STATUSES)[number];

export interface NutritionTarget {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  waterMl?: number;
}

export interface ActivityTarget {
  steps: number;
  exerciseMinutes: number;
  burnedCalories?: number;
}

export interface WeightTarget {
  currentKg?: number;
  targetKg?: number;
  weeklyChangeKg?: number;
}

export interface DailyActuals {
  caloriesConsumed: number;
  carbsConsumed: number;
  proteinConsumed: number;
  fatConsumed: number;
  waterMlConsumed: number;
  stepsCompleted: number;
  exerciseMinutesCompleted: number;
  caloriesBurned: number;
  weightKg?: number;
}

export interface DailyTargetsSnapshot {
  nutrition: NutritionTarget;
  activity: ActivityTarget;
}

export interface PlanRecommendations {
  meals: string[];
  workouts: string[];
  habits: string[];
}

export interface UserPlan {
  source: PlanSource;
  version: number;
  generatedAt: Date;
  summary: string;
  nutrition: NutritionTarget;
  activity: ActivityTarget;
  weight?: WeightTarget;
  recommendations: PlanRecommendations;
  /** Snapshot of the computed NutritionProfile at time of plan generation */
  nutritionProfile?: NutritionProfile;
  promptContext?: string;
  rawResponse?: string;
}

export interface UserDailyProgress {
  date: Date;
  dateKey: string;
  status: DailyProgressStatus;
  targets: DailyTargetsSnapshot;
  actuals: DailyActuals;
  adherenceScore: number;
  notes?: string[];
  completedAt?: Date;
}
