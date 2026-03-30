// ─── Meal Plan Types ──────────────────────────────────────────────────────────

export interface Ingredient {
  item: string;
  quantity: string;
}

export interface MealMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealOption {
  name: string;
  ingredients: Ingredient[];
  macros: MealMacros;
  dietaryTags: string[];
  prepNote?: string;
}

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
  timingNote: string;
  targetMacros: MealMacros;
  options: MealOption[];
}

export interface PlanDay {
  dayNumber: number;
  dayLabel: string;
  dailyTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number;
    fiberG: number;
  };
  meals: DayMeal[];
  workoutNote?: string;
  habitNote?: string;
}

export interface WeeklyMealPlan {
  weekSummary: string;
  days: PlanDay[];
}

export interface DashboardNutritionSnapshot {
  bmr: number;
  maintenanceCalories: number;
  waterMl: number;
  fiberTargetG: number;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface MacroTarget {
  carbs: number;
  protein: number;
  fat: number;
}

export interface MacroProgress extends MacroTarget {
  carbsConsumed: number;
  proteinConsumed: number;
  fatConsumed: number;
}

export interface WeightPoint {
  label: string;
  value: number;
}

export interface DashboardInsight {
  title: string;
  subtitle: string;
  tone: "positive" | "neutral" | "warning";
}

export interface PlanRecommendations {
  meals: string[];
  workouts: string[];
  habits: string[];
}

export interface HomeDashboardData {
  greetingTitle: string;
  calorieGoal: number;
  caloriesEaten: number;
  caloriesBurned: number;
  caloriesLeft: number;
  macros: MacroProgress;
  stepCount: number;
  stepGoal: number;
  exerciseCalories: number;
  exerciseDurationMinutes: number;
  weightTrendKg: WeightPoint[];
  currentWeightKg: number;
  adherenceScore: number;
  todayStatus: "not_started" | "in_progress" | "completed" | "missed";
  planSummary: string;
  recommendations: PlanRecommendations;
  insights: DashboardInsight[];
  source: "mock" | "gemini" | "manual";
  todayMealPlan: PlanDay | null;
  nutritionSnapshot: DashboardNutritionSnapshot;
}

export interface DashboardMeta {
  hasActivePlan: boolean;
  canUseGemini: boolean;
  lastPlanGeneratedAt?: string;
  aiWeeklyRefreshed?: boolean;
  aiSuggestionsStatus?:
    | "ok"
    | "not_due"
    | "gemini_not_configured"
    | "gemini_unavailable";
  aiError?: string;
  mealPlanSource?: "gemini" | "fallback" | "not_generated";
}

export interface HomeDashboardResponse {
  success: boolean;
  message: string;
  data: HomeDashboardData;
  meta: DashboardMeta;
}

export interface UpdateTodayProgressRequest {
  caloriesConsumed?: number;
  carbsConsumed?: number;
  proteinConsumed?: number;
  fatConsumed?: number;
  waterMlConsumed?: number;
  stepsCompleted?: number;
  exerciseMinutesCompleted?: number;
  caloriesBurned?: number;
  weightKg?: number;
  notes?: string[];
}
