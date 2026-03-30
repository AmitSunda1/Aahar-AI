/**
 * Nutrition Calculator
 *
 * All physiological and nutritional calculations for Aahar AI are centralised
 * here.  Every formula is sourced from the accompanying research document
 * "Mathematical and Physiological Foundations of Personalized Nutritional
 * Modeling in Mobile Health Ecosystems".
 *
 * Nothing outside this file should contain nutrition math.
 */

import type {
  ActivityLevel,
  Gender,
  Goal,
  DietaryPreference,
} from "../types/onboarding.types";

// ─── Input / Output Contracts ─────────────────────────────────────────────────

export interface NutritionInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** Steps per day from onboarding — used to cross-validate self-reported PAL */
  dailySteps?: number;
  /** Planned exercise minutes per day (used for water add-on) */
  exerciseMinutesPerDay?: number;
  dietaryPreferences?: DietaryPreference[];
  medicalConditions?: string[];
}

export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MicroLimits {
  sodiumMg: number;
  addedSugarMaxG: number;
  saturatedFatMaxG: number;
  fiberTargetG: number;
}

export interface MedicalOverride {
  condition: string;
  description: string;
}

export interface NutritionProfile {
  /** Step 1 — basal */
  bmr: number;
  /** Step 2 — baseline maintenance */
  maintenanceCalories: number;
  /** Step 3 — goal-adjusted daily calorie target */
  dailyCalorieTarget: number;
  /** Step 4 — macros in grams */
  macros: MacroGrams;
  /** Step 5 — water in ml */
  waterMl: number;
  /** Step 6 — micro limits */
  microLimits: MicroLimits;
  /** PAL multiplier actually used */
  palMultiplier: number;
  /** Activity level that was actually used (may differ if step count override fired) */
  resolvedActivityLevel: ActivityLevel;
  /** Description of any clinical overrides applied */
  medicalOverridesApplied: MedicalOverride[];
}

// ─── Internal Constants ───────────────────────────────────────────────────────

const PAL: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Step-count thresholds from the PDF (Table: Activity Level → Objective Daily
 * Step Count Threshold).  Used to cross-validate self-reported activity.
 */
const STEP_TO_ACTIVITY: Array<{ maxSteps: number; level: ActivityLevel }> = [
  { maxSteps: 4_000, level: "sedentary" },
  { maxSteps: 7_000, level: "light" },
  { maxSteps: 10_000, level: "moderate" },
  { maxSteps: 12_000, level: "active" },
  { maxSteps: Infinity, level: "very_active" },
];

/** Protein targets in g/kg/day by activity level (PDF p.6 table) */
const PROTEIN_PER_KG: Record<ActivityLevel, number> = {
  sedentary: 0.8,
  light: 1.0,
  moderate: 1.2,
  active: 1.6,
  very_active: 1.8,
};

/** Goal-specific macro % ranges — we use the mid-point of each range */
const MACRO_RATIOS: Record<
  Goal,
  { proteinPct: number; carbsPct: number; fatPct: number }
> = {
  maintain_weight: { proteinPct: 0.25, carbsPct: 0.5, fatPct: 0.25 },
  lose_weight: { proteinPct: 0.35, carbsPct: 0.35, fatPct: 0.3 },
  build_muscle: { proteinPct: 0.3, carbsPct: 0.48, fatPct: 0.22 },
  gain_weight: { proteinPct: 0.25, carbsPct: 0.48, fatPct: 0.27 },
};

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

// ─── Step-1: BMR — Mifflin-St Jeor ───────────────────────────────────────────

/**
 * Mifflin-St Jeor equation (1990).
 * Male  : BMR = (10 × kg) + (6.25 × cm) - (5 × age) + 5
 * Female: BMR = (10 × kg) + (6.25 × cm) - (5 × age) - 161
 * Other : average of male and female values
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") return Math.round(base + 5);
  if (gender === "female") return Math.round(base - 161);
  // "other" — average of both
  return Math.round(base + (5 + -161) / 2);
}

// ─── Step-2: PAL resolution ───────────────────────────────────────────────────

/**
 * Resolve the Physical Activity Level that should actually be used.
 * If the user provided a step count we cross-validate their self-reported level.
 * Per the PDF, users tend to over-report by ~51%, so the step count is the
 * objective override when available.
 */
export function resolveActivityLevel(
  reported: ActivityLevel,
  dailySteps?: number,
): ActivityLevel {
  if (!dailySteps || dailySteps <= 0) return reported;

  const stepDerived = STEP_TO_ACTIVITY.find(
    (t) => dailySteps <= t.maxSteps,
  )!.level;

  // Only downgrade (correct over-reporting), never artificially lower a
  // legitimately more active person who logs extra steps.  If the step-derived
  // level is higher than reported we also accept it.
  return stepDerived;
}

// ─── Step-3: TDEE ─────────────────────────────────────────────────────────────

export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return Math.round(bmr * PAL[activityLevel]);
}

// ─── Step-4: Goal-adjusted calorie target ────────────────────────────────────

export function calculateDailyCalorieTarget(
  tdee: number,
  bmr: number,
  goal: Goal,
  medicalConditions: string[] = [],
): number {
  let target: number;

  switch (goal) {
    case "lose_weight":
      // PDF: 15-25% deficit or ~500 kcal deficit targeting 0.5 kg/week
      target = tdee - 500;
      break;
    case "gain_weight":
      target = Math.round(tdee * 1.15);
      break;
    case "build_muscle":
      target = Math.round(tdee * 1.1);
      break;
    default:
      target = tdee;
  }

  // PCOS override: never below 1,400 kcal (avoid metabolic suppression)
  if (medicalConditions.some((c) => /pcos/i.test(c))) {
    target = Math.max(target, 1_400);
  }

  // Hard floor: never below BMR regardless of goal (PDF: "biological floor")
  target = Math.max(target, bmr);

  // Hard ceiling for deficit: no more than 25% below TDEE
  if (goal === "lose_weight") {
    target = Math.max(target, Math.round(tdee * 0.75));
  }

  return Math.round(target);
}

// ─── Step-5: Protein in grams ────────────────────────────────────────────────

function calculateProteinGrams(
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  medicalConditions: string[] = [],
): number {
  // CKD override: protein capped at 0.6 g/kg (PDF p.7)
  if (medicalConditions.some((c) => /ckd|kidney/i.test(c))) {
    return Math.round(0.6 * weightKg);
  }
  // Diabetic Kidney Disease
  if (medicalConditions.some((c) => /diabetic kidney/i.test(c))) {
    return Math.round(0.8 * weightKg);
  }

  let base = PROTEIN_PER_KG[activityLevel];

  // Goal bumps (PDF: high protein during cut preserves lean mass; higher for muscle gain)
  if (goal === "lose_weight") base += 0.15;
  if (goal === "build_muscle") base += 0.2;

  return Math.round(base * weightKg);
}

// ─── Step-6: Macro grams ─────────────────────────────────────────────────────

export function calculateMacros(
  dailyCalorieTarget: number,
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  medicalConditions: string[] = [],
): MacroGrams {
  const ratios = MACRO_RATIOS[goal];
  const proteinByWeightG = calculateProteinGrams(
    weightKg,
    activityLevel,
    goal,
    medicalConditions,
  );
  const proteinByRatioG = Math.round(
    (dailyCalorieTarget * ratios.proteinPct) / KCAL_PER_G.protein,
  );

  // For healthy users, respect both the minimum protein per kg guidance and the
  // goal-specific macro split by taking the higher of the two. For renal
  // conditions, keep the medical cap from calculateProteinGrams unchanged.
  const hasRenalRestriction = medicalConditions.some((c) =>
    /ckd|kidney|diabetic kidney/i.test(c),
  );
  const proteinG = hasRenalRestriction
    ? proteinByWeightG
    : Math.max(proteinByWeightG, proteinByRatioG);
  const proteinKcal = proteinG * KCAL_PER_G.protein;

  // Remaining calories after protein are split between carbs and fat
  const remaining = Math.max(0, dailyCalorieTarget - proteinKcal);

  // Carb/fat split is based on their relative percentage within the remaining budget
  const carbFatTotal = ratios.carbsPct + ratios.fatPct;
  const carbShare = ratios.carbsPct / carbFatTotal;
  const fatShare = ratios.fatPct / carbFatTotal;

  const carbsG = Math.round((remaining * carbShare) / KCAL_PER_G.carbs);
  const fatG = Math.round((remaining * fatShare) / KCAL_PER_G.fat);

  return { protein: proteinG, carbs: carbsG, fat: fatG };
}

// ─── Step-7: Water ───────────────────────────────────────────────────────────

/**
 * Daily Water (ml) = weight_kg × 33
 * + 350ml per 30 min of planned exercise
 */
export function calculateWaterMl(
  weightKg: number,
  exerciseMinutesPerDay = 0,
): number {
  const base = Math.round(weightKg * 33);
  const exerciseAddon = Math.round((exerciseMinutesPerDay / 30) * 350);
  return base + exerciseAddon;
}

// ─── Step-8: Fiber & micro limits ────────────────────────────────────────────

/**
 * Fiber: 14g per 1,000 kcal (PDF p.6)
 * Sodium, added sugar, saturated fat: AHA/WHO guidelines (PDF p.7)
 */
export function calculateMicroLimits(
  dailyCalorieTarget: number,
  medicalConditions: string[] = [],
): MicroLimits {
  const fiberBase = Math.round((dailyCalorieTarget / 1_000) * 14);

  // Diabetes: raise fiber goal to 35–40g
  const fiberTargetG = medicalConditions.some((c) => /diabet/i.test(c))
    ? Math.max(fiberBase, 35)
    : fiberBase;

  // Sodium: 2,300mg healthy adults; 1,500mg hypertension/CKD
  const atRisk = medicalConditions.some((c) =>
    /hypertension|ckd|kidney/i.test(c),
  );
  const sodiumMg = atRisk ? 1_500 : 2_300;

  // Added sugar: ≤10% of calories  (1g sugar = 4 kcal)
  const addedSugarMaxG = Math.round((dailyCalorieTarget * 0.1) / 4);

  // Saturated fat: <10% of calories (1g fat = 9 kcal)
  const saturatedFatMaxG = Math.round((dailyCalorieTarget * 0.1) / 9);

  return { fiberTargetG, sodiumMg, addedSugarMaxG, saturatedFatMaxG };
}

// ─── Step-9: Exercise calories (MET formula) ─────────────────────────────────

/**
 * Calories Burned (Exercise) = MET × 3.5 × (weight_kg / 200) × duration_minutes
 * (PDF p.4)
 */
export function calculateExerciseCalories(
  metValue: number,
  weightKg: number,
  durationMinutes: number,
): number {
  return Math.round(metValue * 3.5 * (weightKg / 200) * durationMinutes);
}

// ─── Step-10: Medical overrides summary ──────────────────────────────────────

function buildMedicalOverrides(
  medicalConditions: string[],
  goal: Goal,
): MedicalOverride[] {
  const overrides: MedicalOverride[] = [];
  const conds = medicalConditions.map((c) => c.toLowerCase());

  if (conds.some((c) => /\bckd\b|chronic kidney/i.test(c))) {
    overrides.push({
      condition: "CKD",
      description:
        "Protein capped at 0.6 g/kg/day and sodium limited to 1,500 mg to reduce renal workload. Plant-based proteins preferred.",
    });
  }
  if (conds.some((c) => /diabet/i.test(c))) {
    overrides.push({
      condition: "Diabetes",
      description:
        "Fiber target raised to ≥35 g/day. Meal plan prioritises low-glycemic, high-fiber carbohydrate sources.",
    });
  }
  if (conds.some((c) => /hypertension|high blood pressure/i.test(c))) {
    overrides.push({
      condition: "Hypertension",
      description:
        "Sodium limited to 1,500 mg/day. Meal plan avoids processed and high-sodium foods.",
    });
  }
  if (conds.some((c) => /pcos/i.test(c))) {
    overrides.push({
      condition: "PCOS",
      description:
        "Calorie floor raised to 1,400 kcal to prevent hormonal disruption. Meal plan emphasises anti-inflammatory foods.",
    });
  }
  if (conds.some((c) => /thyroid/i.test(c))) {
    overrides.push({
      condition: "Thyroid",
      description:
        "No numeric override applied (requires clinical supervision). Meal plan notes thyroid condition for Gemini context.",
    });
  }
  if (conds.some((c) => /lactose/i.test(c))) {
    overrides.push({
      condition: "Lactose Intolerance",
      description: "Treated as dairy-free dietary preference in meal planning.",
    });
  }

  return overrides;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Compute the complete NutritionProfile for a user from their onboarding data.
 * This is the single authoritative source for all dashboard targets.
 */
export function computeNutritionProfile(
  input: NutritionInput,
): NutritionProfile {
  const {
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    goal,
    dailySteps,
    exerciseMinutesPerDay = 0,
    medicalConditions = [],
  } = input;

  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const resolvedActivityLevel = resolveActivityLevel(activityLevel, dailySteps);
  const palMultiplier = PAL[resolvedActivityLevel];
  const maintenanceCalories = calculateTDEE(bmr, resolvedActivityLevel);
  const dailyCalorieTarget = calculateDailyCalorieTarget(
    maintenanceCalories,
    bmr,
    goal,
    medicalConditions,
  );
  const macros = calculateMacros(
    dailyCalorieTarget,
    weightKg,
    resolvedActivityLevel,
    goal,
    medicalConditions,
  );
  const waterMl = calculateWaterMl(weightKg, exerciseMinutesPerDay);
  const microLimits = calculateMicroLimits(
    dailyCalorieTarget,
    medicalConditions,
  );
  const medicalOverridesApplied = buildMedicalOverrides(
    medicalConditions,
    goal,
  );

  return {
    bmr,
    maintenanceCalories,
    dailyCalorieTarget,
    macros,
    waterMl,
    microLimits,
    palMultiplier,
    resolvedActivityLevel,
    medicalOverridesApplied,
  };
}

// ─── Helpers for other modules ───────────────────────────────────────────────

/**
 * Convert height from the user's stored measurement to centimetres.
 * Stored as { value, unit } where unit is "cm" or "ft" or "in".
 *
 * Guard: real human height in feet is always 3–9. If the stored value exceeds 9
 * with unit "ft" it was almost certainly a cm value saved with the wrong unit
 * label (a known client-side bug). Return it as-is (already cm).
 */
export function toHeightCm(value: number, unit: string): number {
  if (unit === "cm") return value;
  if (unit === "ft") {
    if (value > 9) return value; // guard: treat as accidental cm
    return Math.round(value * 30.48);
  }
  if (unit === "in") {
    if (value > 100) return value; // guard: treat as accidental cm
    return Math.round(value * 2.54);
  }
  return value; // fallback
}

/**
 * Convert weight to kilograms from user's stored measurement.
 */
export function toWeightKg(value: number, unit: string): number {
  if (unit === "kg") return value;
  if (unit === "lbs" || unit === "lb")
    return Number((value / 2.20462).toFixed(1));
  return value;
}

/**
 * Derive typical exercise minutes per day from activity level.
 * Used when the user hasn't yet logged any workouts.
 */
export function exerciseMinutesFromActivity(activity: ActivityLevel): number {
  switch (activity) {
    case "very_active":
      return 60;
    case "active":
      return 45;
    case "moderate":
      return 35;
    case "light":
      return 20;
    default:
      return 10;
  }
}
