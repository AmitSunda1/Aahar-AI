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
const progress_types_1 = require("../../types/progress.types");
const nutritionTargetSchema = new mongoose_1.Schema({
    calories: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    waterMl: { type: Number, min: 0 },
}, { _id: false });
const activityTargetSchema = new mongoose_1.Schema({
    steps: { type: Number, required: true, min: 0 },
    exerciseMinutes: { type: Number, required: true, min: 0 },
    burnedCalories: { type: Number, min: 0 },
}, { _id: false });
const weightTargetSchema = new mongoose_1.Schema({
    currentKg: { type: Number, min: 0 },
    targetKg: { type: Number, min: 0 },
    weeklyChangeKg: { type: Number },
}, { _id: false });
const planRecommendationsSchema = new mongoose_1.Schema({
    meals: { type: [String], default: [] },
    workouts: { type: [String], default: [] },
    habits: { type: [String], default: [] },
}, { _id: false });
const userPlanSchema = new mongoose_1.Schema({
    source: { type: String, enum: [...progress_types_1.PLAN_SOURCES], required: true },
    version: { type: Number, required: true, min: 1 },
    generatedAt: { type: Date, required: true },
    summary: { type: String, required: true, trim: true },
    nutrition: { type: nutritionTargetSchema, required: true },
    activity: { type: activityTargetSchema, required: true },
    weight: { type: weightTargetSchema },
    recommendations: {
        type: planRecommendationsSchema,
        required: true,
        default: () => ({ meals: [], workouts: [], habits: [] }),
    },
    promptContext: { type: String },
    rawResponse: { type: String },
    /** Full NutritionProfile snapshot stored as a flexible sub-document */
    nutritionProfile: { type: mongoose_1.Schema.Types.Mixed },
}, { _id: false });
const dailyActualsSchema = new mongoose_1.Schema({
    caloriesConsumed: { type: Number, required: true, min: 0, default: 0 },
    carbsConsumed: { type: Number, required: true, min: 0, default: 0 },
    proteinConsumed: { type: Number, required: true, min: 0, default: 0 },
    fatConsumed: { type: Number, required: true, min: 0, default: 0 },
    waterMlConsumed: { type: Number, required: true, min: 0, default: 0 },
    stepsCompleted: { type: Number, required: true, min: 0, default: 0 },
    exerciseMinutesCompleted: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    caloriesBurned: { type: Number, required: true, min: 0, default: 0 },
    weightKg: { type: Number, min: 0 },
}, { _id: false });
const dailyTargetsSnapshotSchema = new mongoose_1.Schema({
    nutrition: { type: nutritionTargetSchema, required: true },
    activity: { type: activityTargetSchema, required: true },
}, { _id: false });
const userDailyProgressSchema = new mongoose_1.Schema({
    date: { type: Date, required: true },
    dateKey: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: [...progress_types_1.DAILY_PROGRESS_STATUSES],
        required: true,
        default: "not_started",
    },
    targets: { type: dailyTargetsSnapshotSchema, required: true },
    actuals: {
        type: dailyActualsSchema,
        required: true,
        default: () => ({
            caloriesConsumed: 0,
            carbsConsumed: 0,
            proteinConsumed: 0,
            fatConsumed: 0,
            waterMlConsumed: 0,
            stepsCompleted: 0,
            exerciseMinutesCompleted: 0,
            caloriesBurned: 0,
        }),
    },
    adherenceScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
    },
    notes: { type: [String], default: undefined },
    completedAt: { type: Date },
}, { _id: false });
const userProgressSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    activePlan: { type: userPlanSchema },
    planHistory: { type: [userPlanSchema], default: [] },
    dailyProgress: { type: [userDailyProgressSchema], default: [] },
    lastPlanGeneratedAt: { type: Date },
    lastProgressUpdatedAt: { type: Date },
}, { timestamps: true });
userProgressSchema.index({ user: 1, "dailyProgress.dateKey": 1 });
const UserProgress = mongoose_1.default.model("UserProgress", userProgressSchema);
exports.default = UserProgress;
