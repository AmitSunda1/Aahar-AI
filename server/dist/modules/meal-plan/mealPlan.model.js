"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// ─── Sub-schemas ──────────────────────────────────────────────────────────────
const ingredientSchema = new mongoose_1.Schema({
    item: { type: String, required: true },
    quantity: { type: String, required: true },
}, { _id: false });
const mealMacrosSchema = new mongoose_1.Schema({
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
}, { _id: false });
const mealOptionSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    ingredients: { type: [ingredientSchema], required: true },
    macros: { type: mealMacrosSchema, required: true },
    dietaryTags: { type: [String], default: [] },
    prepNote: { type: String },
}, { _id: false });
const dayMealSchema = new mongoose_1.Schema({
    mealType: {
        type: String,
        enum: [
            "breakfast",
            "mid_morning",
            "lunch",
            "pre_workout",
            "post_workout",
            "dinner",
            "evening_snack",
        ],
        required: true,
    },
    timingNote: { type: String, required: true },
    targetMacros: { type: mealMacrosSchema, required: true },
    options: { type: [mealOptionSchema], required: true },
}, { _id: false });
const planDaySchema = new mongoose_1.Schema({
    dayNumber: { type: Number, required: true, min: 1, max: 7 },
    dayLabel: { type: String, required: true },
    dailyTargets: { type: mealMacrosSchema, required: true },
    meals: { type: [dayMealSchema], required: true },
    workoutNote: { type: String, required: true },
    habitNote: { type: String, required: true },
}, { _id: false });
const weeklyMealPlanSchema = new mongoose_1.Schema({
    weekSummary: { type: String, required: true },
    days: { type: [planDaySchema], required: true },
}, { _id: false });
// NutritionProfile is stored as a plain Mixed document snapshot
const mealPlanSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    weekStartDate: { type: Date, required: true },
    plan: { type: weeklyMealPlanSchema, required: true },
    generatedBy: { type: String, enum: ["gemini", "fallback"], required: true },
    nutritionProfile: { type: mongoose_1.Schema.Types.Mixed, required: true },
    promptContext: { type: String },
    rawGeminiResponse: { type: String },
}, { timestamps: true });
// Latest-plan-per-user lookup
mealPlanSchema.index({ user: 1, createdAt: -1 });
const MealPlan = mongoose_1.default.model("MealPlan", mealPlanSchema);
exports.default = MealPlan;
