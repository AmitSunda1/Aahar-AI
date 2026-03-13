// Centralised domain types for the onboarding profile.
// Imported by onboardingSlice, onboardingApi, and all step components.

export type Gender = "male" | "female" | "other";

export type Goal =
  | "lose_weight"
  | "maintain_weight"
  | "gain_weight"
  | "build_muscle";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type DietaryPreference =
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "soy_free";

export interface Measurement {
  value: number;
  unit: string;
}

export interface OnboardingDraft {
  name?: string;
  gender?: Gender;
  age?: number;
  height?: Measurement;
  weight?: Measurement;
  goal?: Goal;
  activityLevel?: ActivityLevel;
  dailySteps?: number;
  dietaryPreferences?: DietaryPreference[];
  medicalConditions?: string[];
}
