import { z } from "zod";
import {
  GENDERS,
  GOALS,
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
} from "../types/onboarding.types";

const heightSchema = z.object({
  value: z
    .number()
    .positive("Height must be positive")
    .max(1_000, "Height value looks unrealistic"),
  unit: z.enum(["cm", "ft", "in"], {
    message: "Height unit must be cm, ft, or in",
  }),
});

const weightSchema = z.object({
  value: z
    .number()
    .positive("Weight must be positive")
    .max(1_500, "Weight value looks unrealistic"),
  unit: z.enum(["kg", "lb", "lbs"], {
    message: "Weight unit must be kg, lb, or lbs",
  }),
});

export const onboardingValidator = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  gender: z.enum(GENDERS, { message: "Gender must be male, female, or other" }),
  age: z
    .number()
    .int("Age must be a whole number")
    .min(10, "Age must be at least 10")
    .max(120, "Age must be at most 120"),
  height: heightSchema,
  weight: weightSchema,
  goal: z.enum(GOALS, { message: "Invalid goal value" }),
  activityLevel: z.enum(ACTIVITY_LEVELS, { message: "Invalid activity level" }),
  dailySteps: z
    .number()
    .int("Daily steps must be a whole number")
    .min(0, "Daily steps cannot be negative"),
  dietaryPreferences: z
    .array(z.enum(DIETARY_PREFERENCES))
    .min(1, "Select at least one dietary preference"),
  medicalConditions: z
    .array(z.string().trim().min(1).max(80))
    .max(12)
    .default([]),
});

export type OnboardingInput = z.infer<typeof onboardingValidator>;
