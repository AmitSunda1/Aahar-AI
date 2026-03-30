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
const onboarding_types_1 = require("../../types/onboarding.types");
// ─── Schema ───────────────────────────────────────────────────────────────────
const measurementSchema = new mongoose_1.Schema({
    value: { type: Number, required: true },
    unit: { type: String, required: true },
}, { _id: false });
const userSchema = new mongoose_1.Schema({
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
    isCompletedOnboarding: {
        type: Boolean,
        default: false,
    },
    // ─── Onboarding Profile ──────────────────────────────────────────
    name: { type: String, trim: true },
    gender: { type: String, enum: [...onboarding_types_1.GENDERS] },
    age: { type: Number, min: 10, max: 120 },
    height: { type: measurementSchema },
    weight: { type: measurementSchema },
    goal: { type: String, enum: [...onboarding_types_1.GOALS] },
    activityLevel: { type: String, enum: [...onboarding_types_1.ACTIVITY_LEVELS] },
    dailySteps: { type: Number, min: 0 },
    dietaryPreferences: {
        type: [String],
        enum: [...onboarding_types_1.DIETARY_PREFERENCES],
        default: undefined,
    },
    medicalConditions: {
        type: [String],
        default: undefined,
    },
}, { timestamps: true });
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
