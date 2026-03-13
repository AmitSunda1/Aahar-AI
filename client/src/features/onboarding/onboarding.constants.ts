// All onboarding option lists and preset values live here.
// Step components import directly from this file — no more inline arrays.

import type {
  Gender,
  Goal,
  ActivityLevel,
  DietaryPreference,
} from "./onboarding.types";

// ─── Select / radio options ───────────────────────────────────────────────────

export const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export const GOAL_OPTIONS: { label: string; value: Goal }[] = [
  { label: "Lose weight", value: "lose_weight" },
  { label: "Maintain weight", value: "maintain_weight" },
  { label: "Gain weight", value: "gain_weight" },
  { label: "Build muscle", value: "build_muscle" },
];

export const ACTIVITY_LEVEL_OPTIONS: {
  label: string;
  sublabel: string;
  value: ActivityLevel;
}[] = [
  { label: "Sedentary", sublabel: "Little or no exercise", value: "sedentary" },
  { label: "Light", sublabel: "Exercise 1-3 days/week", value: "light" },
  { label: "Moderate", sublabel: "Exercise 3-5 days/week", value: "moderate" },
  { label: "Active", sublabel: "Exercise 6-7 days/week", value: "active" },
  {
    label: "Very Active",
    sublabel: "Intense exercise daily",
    value: "very_active",
  },
];

export const DIETARY_PREFERENCE_OPTIONS: {
  label: string;
  value: DietaryPreference;
}[] = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Pescatarian", value: "pescatarian" },
  { label: "Gluten-free", value: "gluten_free" },
  { label: "Dairy-free", value: "dairy_free" },
  { label: "Nut-free", value: "nut_free" },
  { label: "Soy-free", value: "soy_free" },
];

export const MEDICAL_CONDITION_PRESETS: { label: string; value: string }[] = [
  { label: "None", value: "none" },
  { label: "Diabetes", value: "diabetes" },
  { label: "PCOS", value: "pcos" },
  { label: "Thyroid disorder", value: "thyroid_disorder" },
  { label: "Hypertension", value: "hypertension" },
  { label: "Heart disease", value: "heart_disease" },
];

// ─── Scroller / preset values ─────────────────────────────────────────────────

export const AGES = Array.from({ length: 101 }, (_, i) => i + 10); // 10–110

export const CM_VALUES = Array.from({ length: 121 }, (_, i) => i + 100); // 100–220 cm

export const FT_VALUES = [
  "4'0\"",
  "4'1\"",
  "4'2\"",
  "4'3\"",
  "4'4\"",
  "4'5\"",
  "4'6\"",
  "4'7\"",
  "4'8\"",
  "4'9\"",
  "4'10\"",
  "4'11\"",
  "5'0\"",
  "5'1\"",
  "5'2\"",
  "5'3\"",
  "5'4\"",
  "5'5\"",
  "5'6\"",
  "5'7\"",
  "5'8\"",
  "5'9\"",
  "5'10\"",
  "5'11\"",
  "6'0\"",
  "6'1\"",
  "6'2\"",
  "6'3\"",
  "6'4\"",
  "6'5\"",
  "6'6\"",
  "6'7\"",
  "6'8\"",
  "6'9\"",
  "6'10\"",
  "6'11\"",
  "7'0\"",
];

export const KG_VALUES = Array.from({ length: 201 }, (_, i) => i + 20); // 20–220 kg

export const LBS_VALUES = Array.from({ length: 441 }, (_, i) => i + 44); // 44–484 lbs

export const DAILY_STEPS_PRESETS = [3000, 5000, 7500, 10000, 12500, 15000];
