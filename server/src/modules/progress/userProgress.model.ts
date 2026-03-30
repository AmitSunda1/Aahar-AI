import mongoose, { Document, Schema } from "mongoose";
import {
  DAILY_PROGRESS_STATUSES,
  PLAN_SOURCES,
} from "../../types/progress.types";
import type {
  ActivityTarget,
  DailyActuals,
  DailyProgressStatus,
  DailyTargetsSnapshot,
  NutritionTarget,
  PlanRecommendations,
  PlanSource,
  UserDailyProgress,
  UserPlan,
  WeightTarget,
} from "../../types/progress.types";

export type {
  ActivityTarget,
  DailyActuals,
  DailyProgressStatus,
  DailyTargetsSnapshot,
  NutritionTarget,
  PlanRecommendations,
  PlanSource,
  UserDailyProgress,
  UserPlan,
  WeightTarget,
} from "../../types/progress.types";

export interface IUserProgress extends Document {
  user: mongoose.Types.ObjectId;
  activePlan?: UserPlan;
  planHistory: UserPlan[];
  dailyProgress: UserDailyProgress[];
  lastPlanGeneratedAt?: Date;
  lastProgressUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const nutritionTargetSchema = new Schema<NutritionTarget>(
  {
    calories: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    waterMl: { type: Number, min: 0 },
  },
  { _id: false },
);

const activityTargetSchema = new Schema<ActivityTarget>(
  {
    steps: { type: Number, required: true, min: 0 },
    exerciseMinutes: { type: Number, required: true, min: 0 },
    burnedCalories: { type: Number, min: 0 },
  },
  { _id: false },
);

const weightTargetSchema = new Schema<WeightTarget>(
  {
    currentKg: { type: Number, min: 0 },
    targetKg: { type: Number, min: 0 },
    weeklyChangeKg: { type: Number },
  },
  { _id: false },
);

const planRecommendationsSchema = new Schema<PlanRecommendations>(
  {
    meals: { type: [String], default: [] },
    workouts: { type: [String], default: [] },
    habits: { type: [String], default: [] },
  },
  { _id: false },
);

const userPlanSchema = new Schema<UserPlan>(
  {
    source: { type: String, enum: [...PLAN_SOURCES], required: true },
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
    nutritionProfile: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const dailyActualsSchema = new Schema<DailyActuals>(
  {
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
  },
  { _id: false },
);

const dailyTargetsSnapshotSchema = new Schema<DailyTargetsSnapshot>(
  {
    nutrition: { type: nutritionTargetSchema, required: true },
    activity: { type: activityTargetSchema, required: true },
  },
  { _id: false },
);

const userDailyProgressSchema = new Schema<UserDailyProgress>(
  {
    date: { type: Date, required: true },
    dateKey: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [...DAILY_PROGRESS_STATUSES],
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
  },
  { _id: false },
);

const userProgressSchema = new Schema<IUserProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true },
);

userProgressSchema.index({ user: 1, "dailyProgress.dateKey": 1 });

const UserProgress = mongoose.model<IUserProgress>(
  "UserProgress",
  userProgressSchema,
);

export default UserProgress;
