"use strict";
// Centralised domain enums and types for onboarding profile.
// All consumers (model, validators, controllers) import from here —
// so adding / removing an enum value only happens in one place.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIETARY_PREFERENCES = exports.ACTIVITY_LEVELS = exports.GOALS = exports.GENDERS = void 0;
exports.GENDERS = ["male", "female", "other"];
exports.GOALS = [
    "lose_weight",
    "maintain_weight",
    "gain_weight",
    "build_muscle",
];
exports.ACTIVITY_LEVELS = [
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
];
exports.DIETARY_PREFERENCES = [
    "vegetarian",
    "vegan",
    "pescatarian",
    "gluten_free",
    "dairy_free",
    "nut_free",
    "soy_free",
];
