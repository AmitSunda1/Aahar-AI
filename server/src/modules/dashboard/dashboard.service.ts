import type { IUser } from "../user/user.model";
import type { IUserProgress, UserPlan } from "../progress/userProgress.model";
import type { WorkoutSession } from "../progress/userProgress.model";
import type { IMealPlan } from "../meal-plan/mealPlan.model";
import type { GeminiMealPlanResponse } from "../../validators/dashboard.validator";
import {
  computeNutritionProfile,
  exerciseMinutesFromActivity,
  resolveActivityLevel,
  toHeightCm,
  toWeightKg,
  type NutritionProfile,
} from "../../utils/nutrition.calculator";
import type { ActivityLevel, Gender, Goal } from "../../types/onboarding.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardInsight {
  title: string;
  subtitle: string;
  tone: "positive" | "neutral" | "warning";
}

export interface DashboardNutritionSnapshot {
  bmr: number;
  maintenanceCalories: number;
  waterMl: number;
  fiberTargetG: number;
}

export interface DashboardHomeData {
  greetingTitle: string;
  calorieGoal: number;
  caloriesEaten: number;
  caloriesBurned: number;
  caloriesLeft: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
    carbsConsumed: number;
    proteinConsumed: number;
    fatConsumed: number;
  };
  stepCount: number;
  stepGoal: number;
  exerciseCalories: number;
  exerciseDurationMinutes: number;
  weightTrendKg: Array<{ label: string; value: number }>;
  currentWeightKg: number;
  adherenceScore: number;
  todayStatus: "not_started" | "in_progress" | "completed" | "missed";
  planSummary: string;
  recommendations: {
    meals: string[];
    workouts: string[];
    habits: string[];
  };
  insights: DashboardInsight[];
  source: "mock" | "gemini" | "manual";
  weeklyMealPlan: IMealPlan["plan"] | null;
  nutritionSnapshot: DashboardNutritionSnapshot;
  workoutSessions: WorkoutSession[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const resolveUserInputs = (
  user: IUser,
): { weightKg: number; heightCm: number } => ({
  weightKg: user.weight
    ? toWeightKg(Number(user.weight.value), user.weight.unit)
    : 70,
  heightCm: user.height
    ? toHeightCm(Number(user.height.value), user.height.unit)
    : 170,
});

// ─── Public: compute the full nutrition profile for a user ────────────────────

export const computeUserNutritionProfile = (user: IUser): NutritionProfile => {
  const { weightKg, heightCm } = resolveUserInputs(user);
  const activityLevel = (user.activityLevel as ActivityLevel) ?? "moderate";
  const resolvedActivityLevel = resolveActivityLevel(
    activityLevel,
    user.dailySteps,
  );

  return computeNutritionProfile({
    weightKg,
    heightCm,
    age: user.age ?? 25,
    gender: (user.gender as Gender) ?? "other",
    activityLevel,
    goal: (user.goal as Goal) ?? "maintain_weight",
    dailySteps: user.dailySteps,
    exerciseMinutesPerDay: exerciseMinutesFromActivity(resolvedActivityLevel),
    dietaryPreferences: (user.dietaryPreferences as any[]) ?? [],
    medicalConditions: user.medicalConditions ?? [],
  });
};

// ─── Build a UserPlan from onboarding profile (stored in UserProgress) ────────

export const buildPlanFromProfile = (
  user: IUser,
): Omit<UserPlan, "version" | "generatedAt"> => {
  const nutritionProfile = computeUserNutritionProfile(user);
  const { weightKg } = resolveUserInputs(user);
  const goal = (user.goal as Goal) ?? "maintain_weight";
  const stepGoal = Math.max(6_000, user.dailySteps ?? 9_000);
  const exerciseMinutes = exerciseMinutesFromActivity(
    nutritionProfile.resolvedActivityLevel,
  );
  const { dailyCalorieTarget, macros, waterMl } = nutritionProfile;

  const targetWeightKg =
    goal === "lose_weight"
      ? Number((weightKg - 4).toFixed(1))
      : goal === "gain_weight" || goal === "build_muscle"
        ? Number((weightKg + 3).toFixed(1))
        : weightKg;

  return {
    source: "mock",
    summary: `Personalised ${goal.replace(/_/g, " ")} plan for ${user.name ?? "you"}, computed from your onboarding profile using Mifflin-St Jeor metabolic modelling.`,
    nutrition: {
      calories: dailyCalorieTarget,
      carbs: macros.carbs,
      protein: macros.protein,
      fat: macros.fat,
      waterMl,
    },
    activity: {
      steps: stepGoal,
      exerciseMinutes,
      burnedCalories: Math.round(exerciseMinutes * 7),
    },
    weight: {
      currentKg: weightKg,
      targetKg: targetWeightKg,
      weeklyChangeKg:
        goal === "lose_weight"
          ? -0.5
          : goal === "gain_weight" || goal === "build_muscle"
            ? 0.3
            : 0,
    },
    recommendations: {
      meals: [
        "Build meals around dal, curd, paneer, eggs, or lean chicken for steady protein.",
        "Keep one fruit and one high-protein snack ready between meals.",
        "Match carb portions to your goal using rice, roti, poha, or oats.",
      ],
      workouts: [
        "Aim for one focused workout session and one brisk walk daily.",
        "Use simple progressive strength work 3 to 4 times each week.",
      ],
      habits: [
        "Start the day with water before caffeine.",
        "Keep dinner lighter than lunch on less active days.",
        `Try to reach ${stepGoal.toLocaleString()} steps before the evening.`,
      ],
    },
    nutritionProfile,
    rawResponse: undefined,
    promptContext: undefined,
  };
};

// ─── Build the Gemini meal plan prompt ───────────────────────────────────────

export const buildGeminiMealPlanPrompt = (
  user: IUser,
  nutritionProfile: NutritionProfile,
): string => {
  const {
    dailyCalorieTarget,
    macros,
    waterMl,
    microLimits,
    medicalOverridesApplied,
    safety,
  } = nutritionProfile;

  const dietaryPrefs = (user.dietaryPreferences as string[]) ?? [];
  const medicalConds = user.medicalConditions ?? [];

  const dietaryRules: string[] = [];
  if (dietaryPrefs.includes("vegetarian"))
    dietaryRules.push("STRICTLY vegetarian — NO meat, NO fish, NO eggs");
  if (dietaryPrefs.includes("vegan"))
    dietaryRules.push(
      "STRICTLY vegan — NO animal products including dairy and eggs",
    );
  if (dietaryPrefs.includes("pescatarian"))
    dietaryRules.push("Pescatarian — fish allowed but NO other meat");
  if (dietaryPrefs.includes("dairy_free"))
    dietaryRules.push("NO dairy (no milk, paneer, curd, ghee, butter, cheese)");
  if (dietaryPrefs.includes("gluten_free"))
    dietaryRules.push(
      "Gluten-free — NO wheat or maida. Use rice, jowar, bajra, besan",
    );
  if (dietaryPrefs.includes("nut_free"))
    dietaryRules.push("NO nuts or nut-based ingredients");
  if (dietaryPrefs.includes("soy_free"))
    dietaryRules.push("NO soy or soy-based products");
  if (medicalConds.some((c) => /lactose/i.test(c)))
    dietaryRules.push("Lactose intolerant — NO dairy products");

  const medicalRules = medicalOverridesApplied.map((o) => o.description);
  const safetyRules: string[] = [];
  if (safety.conservativeModeApplied) {
    safetyRules.push(
      "Conservative safety mode is active. Avoid aggressive deficits/surpluses and keep meal planning clinically cautious.",
    );
  }
  if (safety.needsClinicianReview) {
    safetyRules.push(
      `Unknown conditions requiring clinician review: ${safety.unknownMedicalConditions.join(", ")}`,
    );
  }

  const exampleDay = {
    dayNumber: 1,
    dayLabel: "Monday",
    dailyTargets: {
      calories: dailyCalorieTarget,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    },
    meals: [
      {
        mealType: "breakfast",
        timingNote: "Within 1 hour of waking up",
        targetMacros: {
          calories: Math.round(dailyCalorieTarget * 0.22),
          protein: Math.round(macros.protein * 0.2),
          carbs: Math.round(macros.carbs * 0.25),
          fat: Math.round(macros.fat * 0.18),
        },
        options: [
          {
            name: "Example meal name",
            ingredients: [
              { item: "Ingredient", quantity: "150g or 2 pieces or 1 cup" },
            ],
            macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            dietaryTags: ["vegetarian"],
            prepNote: "Optional cooking note",
          },
        ],
      },
    ],
    workoutNote: "Brief exercise guidance for the day",
    habitNote: "One concrete habit tip for the day",
  };

  const lines = [
    "You are a certified nutritionist and Indian cuisine expert generating a personalised 7-day meal plan.",
    "Return ONLY valid JSON — no markdown fences, no explanatory text outside the JSON.",
    "",
    'The root JSON object must have exactly: { "weekSummary": "...", "days": [ /* 7 day objects */ ] }',
    "",
    "Each day object follows this structure (all 7 must follow it exactly):",
    JSON.stringify(exampleDay, null, 2),
    "",
    "=== USER PROFILE ===",
    `Name: ${user.name ?? "User"}`,
    `Gender: ${user.gender ?? "not specified"}`,
    `Age: ${user.age ?? "unknown"} years`,
    `Height: ${user.height?.value ?? "unknown"} ${user.height?.unit ?? "cm"}`,
    `Weight: ${user.weight?.value ?? "unknown"} ${user.weight?.unit ?? "kg"}`,
    `Goal: ${(user.goal ?? "maintain_weight").replace(/_/g, " ")}`,
    `Activity Level: ${user.activityLevel ?? "moderate"}`,
    `Daily Steps Goal: ${user.dailySteps ?? "not specified"}`,
    `Dietary Preferences: ${dietaryPrefs.length ? dietaryPrefs.join(", ") : "none"}`,
    `Medical Conditions: ${medicalConds.length ? medicalConds.join(", ") : "none"}`,
    "",
    "=== COMPUTED DAILY NUTRITION TARGETS (Mifflin-St Jeor + PAL) ===",
    `Total Calories: ${dailyCalorieTarget} kcal`,
    `Protein: ${macros.protein}g`,
    `Carbohydrates: ${macros.carbs}g`,
    `Fat: ${macros.fat}g`,
    `Water: ${waterMl} ml`,
    `Fiber: >=${microLimits.fiberTargetG}g`,
    `Sodium: <${microLimits.sodiumMg} mg`,
    `Added Sugar: <${microLimits.addedSugarMaxG}g`,
    "",
  ];

  if (dietaryRules.length) {
    lines.push("=== STRICT DIETARY RULES — VIOLATION IS NOT ACCEPTABLE ===");
    dietaryRules.forEach((r) => lines.push(`• ${r}`));
    lines.push("");
  }

  if (medicalRules.length) {
    lines.push("=== MEDICAL CONDITION ADJUSTMENTS ===");
    medicalRules.forEach((r) => lines.push(`• ${r}`));
    lines.push("");
  }

  if (safetyRules.length) {
    lines.push("=== SAFETY MODE CONTEXT ===");
    safetyRules.forEach((r) => lines.push(`• ${r}`));
    lines.push("");
  }

  lines.push(
    "=== MEAL PLAN REQUIREMENTS ===",
    "1. Generate exactly 7 day objects (dayNumber 1-7, Monday-Sunday).",
    "2. Each day must include: breakfast, mid_morning, lunch, dinner.",
    "   Add pre_workout and post_workout on 3-4 training days (vary which days).",
    "3. Each meal must have 2-3 alternative options with different ingredients but same target macros.",
    "4. Each option must list ALL ingredients with exact quantities (grams, pieces, or cups).",
    "5. timingNote must be specific: e.g. 'Eat 60-90 min before your workout', 'Within 30 min of waking', 'At least 2 hours before bed'.",
    "6. Use Indian food: dals, sabzis, rotis, rice, idli, dosa, poha, upma, khichdi, paneer, curd, chaat, sprouts, etc.",
    "7. Vary meals across all 7 days — no repeated option names on consecutive days.",
    "8. Approximate macros: protein*4 + carbs*4 + fat*9 = calories.",
    "9. Meal calorie split for standard day: Breakfast 22%, Mid-morning 10%, Lunch 30%, Dinner 28%, Evening snack 10%.",
    "   On training days add pre_workout (~8%) and post_workout (~12%) and reduce dinner proportionally.",
    "10. workoutNote: 1-2 sentence exercise suggestion for the day.",
    "11. habitNote: one actionable lifestyle or nutrition habit for the day.",
    "12. weekSummary: 1-2 sentence coaching summary for the week.",
    "",
    "Be safe, practical, and strictly obey all dietary and medical rules.",
  );

  return lines.join("\n");
};

// ─── Map Gemini response to UserPlan (stored in UserProgress.activePlan) ──────

export const mapGeminiMealPlanToUserPlan = (
  geminiPlan: GeminiMealPlanResponse,
  profilePlan: Omit<UserPlan, "version" | "generatedAt">,
  promptContext: string,
  rawResponse: string,
  nutritionProfile: NutritionProfile,
): Omit<UserPlan, "version" | "generatedAt"> => {
  const meals = geminiPlan.days.map((d) => {
    const lunch = d.meals.find((m) => m.mealType === "lunch");
    return lunch?.options[0]?.name ?? `Day ${d.dayNumber} — ${d.dayLabel}`;
  });

  return {
    source: "gemini",
    summary: geminiPlan.weekSummary,
    // Calorie/macro targets are always deterministic — never from Gemini
    nutrition: profilePlan.nutrition,
    activity: profilePlan.activity,
    weight: profilePlan.weight,
    recommendations: {
      meals,
      workouts: geminiPlan.days.map((d) => d.workoutNote),
      habits: geminiPlan.days.map((d) => d.habitNote),
    },
    nutritionProfile,
    promptContext,
    rawResponse,
  };
};

// ─── Weight trend ─────────────────────────────────────────────────────────────

const buildWeightTrend = (
  currentWeightKg: number,
  progress?: IUserProgress | null,
): Array<{ label: string; value: number }> => {
  const todayKey = new Date().toISOString().slice(0, 10);

  const weightedDays =
    progress?.dailyProgress
      ?.filter((entry) => typeof entry.actuals.weightKg === "number")
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-7)
      .map((entry) => ({
        label: entry.dateKey,
        value: Number(entry.actuals.weightKg?.toFixed(1)),
      })) ?? [];

  if (weightedDays.length > 0) {
    return weightedDays;
  }

  return [{ label: todayKey, value: Number(currentWeightKg.toFixed(1)) }];
};

// ─── Insights ─────────────────────────────────────────────────────────────────

const buildInsights = (
  plan: Omit<UserPlan, "version" | "generatedAt"> | UserPlan,
  adherenceScore: number,
  stepCount: number,
): DashboardInsight[] => {
  const insights: DashboardInsight[] = [];

  insights.push({
    title:
      plan.source === "gemini"
        ? "AI meal plan is ready"
        : "Starter plan is ready",
    subtitle: plan.summary,
    tone: "positive",
  });

  if (adherenceScore >= 80) {
    insights.push({
      title: "Strong progress today",
      subtitle:
        "You are tracking close to your daily targets. Keep the momentum through the evening.",
      tone: "positive",
    });
  } else if (stepCount > 0) {
    insights.push({
      title: "Daily progress is underway",
      subtitle:
        "Your logs are updating. Keep adding meals, steps, and exercise to improve adherence.",
      tone: "neutral",
    });
  } else {
    insights.push({
      title: "Start with one easy win",
      subtitle:
        plan.recommendations.habits[0] ??
        "Log your first meal or walk to start the day with traction.",
      tone: "warning",
    });
  }

  return insights;
};

const buildRecommendationsFromMealPlan = (
  mealPlan: IMealPlan["plan"],
): UserPlan["recommendations"] => {
  return {
    meals: mealPlan.days.map((day) => {
      const lunch = day.meals.find((meal) => meal.mealType === "lunch");
      const mealName = lunch?.options[0]?.name ?? `${day.dayLabel} meal plan`;
      return `${day.dayLabel}: ${mealName}`;
    }),
    workouts: mealPlan.days.map((day) => `${day.dayLabel}: ${day.workoutNote}`),
    habits: mealPlan.days.map((day) => `${day.dayLabel}: ${day.habitNote}`),
  };
};

// ─── Main dashboard state builder ─────────────────────────────────────────────

export const buildDashboardFromState = (
  user: IUser,
  progress?: IUserProgress | null,
  latestMealPlan?: Pick<IMealPlan, "generatedBy" | "plan"> | null,
): DashboardHomeData => {
  const nutritionProfile = computeUserNutritionProfile(user);
  const { weightKg } = resolveUserInputs(user);
  const profilePlan = buildPlanFromProfile(user);
  const activePlan = progress?.activePlan ?? profilePlan;
  const mealPlanRecommendations = latestMealPlan
    ? buildRecommendationsFromMealPlan(latestMealPlan.plan)
    : activePlan.recommendations;
  const normalizedMealPlanSource = latestMealPlan
    ? latestMealPlan.generatedBy === "fallback"
      ? "manual"
      : latestMealPlan.generatedBy
    : null;
  const dashboardSource = normalizedMealPlanSource ?? activePlan.source;
  const dashboardSummary =
    latestMealPlan?.plan.weekSummary ?? activePlan.summary;
  const insightPlan = latestMealPlan
    ? {
        ...activePlan,
        source: normalizedMealPlanSource ?? activePlan.source,
        summary: latestMealPlan.plan.weekSummary,
        recommendations: mealPlanRecommendations,
      }
    : activePlan;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayProgress = progress?.dailyProgress?.find(
    (entry) => entry.dateKey === todayKey,
  );
  const sortedWeightEntries =
    progress?.dailyProgress
      ?.filter((entry) => typeof entry.actuals.weightKg === "number")
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey)) ?? [];
  const latestLoggedWeight =
    sortedWeightEntries.length > 0
      ? sortedWeightEntries[sortedWeightEntries.length - 1].actuals.weightKg
      : undefined;

  const actuals = todayProgress?.actuals ?? {
    caloriesConsumed: 0,
    carbsConsumed: 0,
    proteinConsumed: 0,
    fatConsumed: 0,
    waterMlConsumed: 0,
    stepsCompleted: 0,
    exerciseMinutesCompleted: 0,
    caloriesBurned: 0,
    weightKg,
  };

  const currentWeightKg = Number(
    (
      latestLoggedWeight ??
      actuals.weightKg ??
      activePlan.weight?.currentKg ??
      weightKg
    ).toFixed(1),
  );

  // Calorie & macro targets are always from the authoritative calculator
  const { dailyCalorieTarget, macros: profileMacros } = nutritionProfile;
  const stepGoal = Math.max(6_000, user.dailySteps ?? 9_000);

  return {
    greetingTitle: "Today",
    calorieGoal: dailyCalorieTarget,
    caloriesEaten: actuals.caloriesConsumed,
    caloriesBurned: actuals.caloriesBurned,
    caloriesLeft:
      dailyCalorieTarget - actuals.caloriesConsumed + actuals.caloriesBurned,
    macros: {
      carbs: profileMacros.carbs,
      protein: profileMacros.protein,
      fat: profileMacros.fat,
      carbsConsumed: actuals.carbsConsumed,
      proteinConsumed: actuals.proteinConsumed,
      fatConsumed: actuals.fatConsumed,
    },
    stepCount: actuals.stepsCompleted,
    stepGoal,
    exerciseCalories: actuals.caloriesBurned,
    exerciseDurationMinutes: actuals.exerciseMinutesCompleted,
    weightTrendKg: buildWeightTrend(currentWeightKg, progress),
    currentWeightKg,
    adherenceScore: todayProgress?.adherenceScore ?? 0,
    todayStatus: todayProgress?.status ?? "not_started",
    planSummary: dashboardSummary,
    recommendations: mealPlanRecommendations,
    insights: buildInsights(
      insightPlan,
      todayProgress?.adherenceScore ?? 0,
      actuals.stepsCompleted,
    ),
    source: dashboardSource,
    weeklyMealPlan: latestMealPlan?.plan ?? null,
    nutritionSnapshot: {
      bmr: nutritionProfile.bmr,
      maintenanceCalories: nutritionProfile.maintenanceCalories,
      waterMl: nutritionProfile.waterMl,
      fiberTargetG: nutritionProfile.microLimits.fiberTargetG,
    },
    workoutSessions: progress?.workoutSessions ?? [],
  };
};
