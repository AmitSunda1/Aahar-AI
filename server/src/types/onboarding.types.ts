// Centralised domain enums and types for onboarding profile.
// All consumers (model, validators, controllers) import from here —
// so adding / removing an enum value only happens in one place.

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];

export const GOALS = [
  "lose_weight",
  "maintain_weight",
  "gain_weight",
  "build_muscle",
] as const;
export type Goal = (typeof GOALS)[number];

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const DIETARY_PREFERENCES = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "soy_free",
] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

export interface IMeasurement {
  value: number;
  unit: string;
}
