"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFoodHandler = exports.analyzeFoodHandler = void 0;
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const appError_1 = __importDefault(require("../../utils/appError"));
const user_model_1 = __importDefault(require("../user/user.model"));
const foodAnalysis_service_1 = require("../../services/ai/foodAnalysis.service");
const foodAnalysis_validator_1 = require("../../validators/foodAnalysis.validator");
const userProgress_service_1 = require("../progress/userProgress.service");
/**
 * POST /food/analyze
 * Analyze food image and description to extract nutritional content
 * Body: { image: base64string, mimeType: string, description: string, quantity?: number, unit?: string, notes?: string }
 * Returns: { foodName, description, macros: { calories, protein, carbs, fat }, confidence, ... }
 */
exports.analyzeFoodHandler = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = String(req.user._id);
    // Verify user exists and completed onboarding
    const user = await user_model_1.default.findById(userId);
    if (!user)
        return next(new appError_1.default("User not found", 404));
    if (!user.isCompletedOnboarding) {
        return next(new appError_1.default("Complete onboarding first", 400));
    }
    const { image, mimeType, description, quantity, unit, notes } = req.body;
    // Validate request body
    if (!image || !mimeType) {
        return next(new appError_1.default("Image and mimeType are required", 400));
    }
    if (!description) {
        return next(new appError_1.default("Food description is required", 400));
    }
    // Validate description and optional fields
    const validationResult = foodAnalysis_validator_1.analyzeFoodRequestValidator.safeParse({
        description,
        quantity,
        unit,
        notes,
    });
    if (!validationResult.success) {
        return next(new appError_1.default(validationResult.error.issues[0]?.message ||
            "Invalid request data", 400));
    }
    try {
        // Call Gemini to analyze food
        const analysis = await (0, foodAnalysis_service_1.analyzeFoodImage)(image, mimeType, validationResult.data);
        res.status(200).json({
            success: true,
            message: "Food analysis completed",
            data: analysis,
        });
    }
    catch (error) {
        if (error instanceof appError_1.default) {
            // Handle rate limit errors specially with retry guidance
            if (error.code === "GEMINI_QUOTA_EXCEEDED") {
                return next(new appError_1.default(error.message +
                    " Please wait a moment and try again.", error.statusCode, error.code));
            }
            return next(error);
        }
        return next(new appError_1.default("Failed to analyze food image", 500, "ANALYSIS_FAILED"));
    }
});
/**
 * POST /food/log
 * Log analyzed food to user's daily progress
 * Body: { foodName, macros: { calories, protein, carbs, fat }, mealType?: string }
 * Returns: Updated dashboard with new totals
 */
exports.logFoodHandler = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = String(req.user._id);
    const { foodName, macros } = req.body;
    if (!foodName || !macros) {
        return next(new appError_1.default("foodName and macros are required", 400));
    }
    const { calories, protein, carbs, fat } = macros;
    if (typeof calories !== "number" ||
        typeof protein !== "number" ||
        typeof carbs !== "number" ||
        typeof fat !== "number") {
        return next(new appError_1.default("Invalid macros format", 400));
    }
    try {
        // Update user's daily progress for today
        await (0, userProgress_service_1.upsertDailyProgress)(userId, new Date(), // Today's date
        {
            caloriesConsumed: calories,
            proteinConsumed: protein,
            carbsConsumed: carbs,
            fatConsumed: fat,
        }, [`Logged: ${foodName}`]);
        const user = await user_model_1.default.findById(userId);
        if (!user)
            return next(new appError_1.default("User not found", 404));
        const progress = await (0, userProgress_service_1.getUserProgress)(userId);
        res.status(200).json({
            success: true,
            message: `Food "${foodName}" logged successfully`,
            data: {
                logged: {
                    foodName,
                    macros,
                },
                updatedProgress: progress,
            },
        });
    }
    catch (error) {
        if (error instanceof appError_1.default) {
            return next(error);
        }
        return next(new appError_1.default("Failed to log food", 500, "LOG_FAILED"));
    }
});
