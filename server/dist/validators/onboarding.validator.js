"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingValidator = void 0;
const zod_1 = require("zod");
const onboarding_types_1 = require("../types/onboarding.types");
const measurementSchema = zod_1.z.object({
    value: zod_1.z.number().positive("Value must be positive"),
    unit: zod_1.z.string().min(1),
});
exports.onboardingValidator = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, "Name is required").max(100),
    gender: zod_1.z.enum(onboarding_types_1.GENDERS, { message: "Gender must be male, female, or other" }),
    age: zod_1.z
        .number()
        .int("Age must be a whole number")
        .min(10, "Age must be at least 10")
        .max(120, "Age must be at most 120"),
    height: measurementSchema,
    weight: measurementSchema,
    goal: zod_1.z.enum(onboarding_types_1.GOALS, { message: "Invalid goal value" }),
    activityLevel: zod_1.z.enum(onboarding_types_1.ACTIVITY_LEVELS, { message: "Invalid activity level" }),
    dailySteps: zod_1.z
        .number()
        .int("Daily steps must be a whole number")
        .min(0, "Daily steps cannot be negative"),
    dietaryPreferences: zod_1.z
        .array(zod_1.z.enum(onboarding_types_1.DIETARY_PREFERENCES))
        .min(1, "Select at least one dietary preference"),
    medicalConditions: zod_1.z.array(zod_1.z.string().trim().min(1)).default([]),
});
