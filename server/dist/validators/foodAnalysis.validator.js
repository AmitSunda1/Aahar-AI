"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFoodResponseValidator = exports.analyzeFoodRequestValidator = void 0;
const zod_1 = require("zod");
// ─── Food Analysis Request Validator ───────────────────────────────────────────
exports.analyzeFoodRequestValidator = zod_1.z.object({
    description: zod_1.z
        .string()
        .trim()
        .min(1, "Food description is required")
        .max(500, "Description too long"),
    quantity: zod_1.z.number().min(0.1, "Quantity must be greater than 0").optional(),
    unit: zod_1.z
        .enum(["g", "ml", "pc", "cup", "tbsp", "oz", "l"])
        .optional(),
    notes: zod_1.z.string().trim().max(200).optional(),
});
// ─── Food Analysis Response Validator ──────────────────────────────────────────
const macrosValidator = zod_1.z.object({
    calories: zod_1.z.number().min(0),
    protein: zod_1.z.number().min(0),
    carbs: zod_1.z.number().min(0),
    fat: zod_1.z.number().min(0),
    fiber: zod_1.z.number().min(0).optional(),
    sugar: zod_1.z.number().min(0).optional(),
});
exports.analyzeFoodResponseValidator = zod_1.z.object({
    foodName: zod_1.z.string().trim().min(1),
    description: zod_1.z.string().trim(),
    macros: macrosValidator,
    confidence: zod_1.z.enum(["high", "medium", "low"]),
    servingSize: zod_1.z.string().optional(),
    additionalInfo: zod_1.z.string().optional(),
    dietaryTags: zod_1.z.array(zod_1.z.string()).optional(),
});
