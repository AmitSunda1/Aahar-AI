import mongoose, { Schema, Document } from "mongoose";
import {
  GENDERS,
  GOALS,
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
} from "../../types/onboarding.types";
import type {
  Gender,
  Goal,
  ActivityLevel,
  DietaryPreference,
  IMeasurement,
} from "../../types/onboarding.types";

// Re-export types so existing imports from this file continue to work
export type {
  Gender,
  Goal,
  ActivityLevel,
  DietaryPreference,
  IMeasurement,
} from "../../types/onboarding.types";

export interface IUser extends Document {
  email: string;
  password?: string;
  isEmailVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isCompletedOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Onboarding profile fields
  name?: string;
  gender?: Gender;
  age?: number;
  height?: IMeasurement;
  weight?: IMeasurement;
  goal?: Goal;
  activityLevel?: ActivityLevel;
  dailySteps?: number;
  dietaryPreferences?: DietaryPreference[];
  medicalConditions?: string[];
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const measurementSchema = new Schema<IMeasurement>(
  {
    value: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    isCompletedOnboarding: {
      type: Boolean,
      default: false,
    },

    // ─── Onboarding Profile ──────────────────────────────────────────
    name: { type: String, trim: true },
    gender: { type: String, enum: [...GENDERS] },
    age: { type: Number, min: 10, max: 120 },
    height: { type: measurementSchema },
    weight: { type: measurementSchema },
    goal: { type: String, enum: [...GOALS] },
    activityLevel: { type: String, enum: [...ACTIVITY_LEVELS] },
    dailySteps: { type: Number, min: 0 },
    dietaryPreferences: {
      type: [String],
      enum: [...DIETARY_PREFERENCES],
      default: undefined,
    },
    medicalConditions: {
      type: [String],
      default: undefined,
    },
  },
  { timestamps: true },
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
