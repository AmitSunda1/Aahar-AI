"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnboarding = exports.saveOnboarding = void 0;
const user_model_1 = __importDefault(require("./user.model"));
const appError_1 = __importDefault(require("../../utils/appError"));
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const onboarding_validator_1 = require("../../validators/onboarding.validator");
// ─── POST /onboarding — Save all profile data ──────────────────────────────────
exports.saveOnboarding = (0, asyncHandler_1.default)(async (req, res, next) => {
    // Validate input
    const result = onboarding_validator_1.onboardingValidator.safeParse(req.body);
    if (!result.success) {
        const firstError = result.error.issues[0];
        console.error("Zod Validation Failed:", result.error.issues);
        return next(new appError_1.default(`${firstError.path.join(".")}: ${firstError.message}`, 400, "VALIDATION_ERROR"));
    }
    const { name, gender, age, height, weight, goal, activityLevel, dailySteps, dietaryPreferences, medicalConditions, } = result.data;
    const user = await user_model_1.default.findByIdAndUpdate(req.user._id, {
        name,
        gender,
        age,
        height,
        weight,
        goal,
        activityLevel,
        dailySteps,
        dietaryPreferences,
        medicalConditions,
        isCompletedOnboarding: true,
    }, { new: true, runValidators: true });
    if (!user) {
        return next(new appError_1.default("User not found", 404));
    }
    res.status(200).json({
        success: true,
        message: "Onboarding completed successfully",
        data: { user },
    });
});
// ─── GET /onboarding — Fetch saved profile data ──────────────────────────────
exports.getOnboarding = (0, asyncHandler_1.default)(async (req, res, next) => {
    const user = await user_model_1.default.findById(req.user._id).select("name gender age height weight goal activityLevel dailySteps dietaryPreferences medicalConditions isCompletedOnboarding");
    if (!user) {
        return next(new appError_1.default("User not found", 404));
    }
    res.status(200).json({
        success: true,
        data: { user },
    });
});
