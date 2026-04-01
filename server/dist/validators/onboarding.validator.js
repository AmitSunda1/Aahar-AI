"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingValidator = void 0;
const zod_1 = require("zod");
const onboarding_types_1 = require("../types/onboarding.types");
const heightSchema = zod_1.z.object({
    value: zod_1.z
        .number()
        .positive("Height must be positive")
        .max(1000, "Height value looks unrealistic"),
    unit: zod_1.z.enum(["cm", "ft", "in"], {
        message: "Height unit must be cm, ft, or in",
    }),
});
const weightSchema = zod_1.z.object({
    value: zod_1.z
        .number()
        .positive("Weight must be positive")
        .max(1500, "Weight value looks unrealistic"),
    unit: zod_1.z.enum(["kg", "lb", "lbs"], {
        message: "Weight unit must be kg, lb, or lbs",
    }),
});
exports.onboardingValidator = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Name is required").max(100),
    gender: zod_1.z.enum(onboarding_types_1.GENDERS, { message: "Gender must be male, female, or other" }),
    age: zod_1.z
        .number()
        .int("Age must be a whole number")
        .min(10, "Age must be at least 10")
        .max(120, "Age must be at most 120"),
    height: heightSchema,
    weight: weightSchema,
    goal: zod_1.z.enum(onboarding_types_1.GOALS, { message: "Invalid goal value" }),
    activityLevel: zod_1.z.enum(onboarding_types_1.ACTIVITY_LEVELS, { message: "Invalid activity level" }),
    dailySteps: zod_1.z
        .number()
        .int("Daily steps must be a whole number")
        .min(0, "Daily steps cannot be negative"),
    dietaryPreferences: zod_1.z
        .array(zod_1.z.enum(onboarding_types_1.DIETARY_PREFERENCES))
        .min(1, "Select at least one dietary preference"),
    medicalConditions: zod_1.z
        .array(zod_1.z.string().trim().min(1).max(80))
        .max(12)
        .default([]),
});
