import { z } from "zod";
import {
  GENDERS,
  GOALS,
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
} from "../types/onboarding.types";

const measurementSchema = z.object({
  value: z.number().positive("Value must be positive"),
  unit: z.string().min(1),
});

export const onboardingValidator = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  gender: z.enum(GENDERS, { message: "Gender must be male, female, or other" }),
  age: z
    .number()
    .int("Age must be a whole number")
    .min(10, "Age must be at least 10")
    .max(120, "Age must be at most 120"),
  height: measurementSchema,
  weight: measurementSchema,
  goal: z.enum(GOALS, { message: "Invalid goal value" }),
  activityLevel: z.enum(ACTIVITY_LEVELS, { message: "Invalid activity level" }),
  dailySteps: z
    .number()
    .int("Daily steps must be a whole number")
    .min(0, "Daily steps cannot be negative"),
  dietaryPreferences: z
    .array(z.enum(DIETARY_PREFERENCES))
    .min(1, "Select at least one dietary preference"),
  medicalConditions: z.array(z.string().trim().min(1)).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingValidator>;
