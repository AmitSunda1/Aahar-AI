import { z } from "zod";

// ─── Food Analysis Request Validator ───────────────────────────────────────────

export const analyzeFoodRequestValidator = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Food description is required")
    .max(500, "Description too long"),
  quantity: z.number().min(0.1, "Quantity must be greater than 0").optional(),
  unit: z
    .enum(["g", "ml", "pc", "cup", "tbsp", "oz", "l"])
    .optional(),
  notes: z.string().trim().max(200).optional(),
});

// ─── Food Analysis Response Validator ──────────────────────────────────────────

const macrosValidator = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
});

export const analyzeFoodResponseValidator = z.object({
  foodName: z.string().trim().min(1),
  description: z.string().trim(),
  macros: macrosValidator,
  confidence: z.enum(["high", "medium", "low"]),
  servingSize: z.string().optional(),
  additionalInfo: z.string().optional(),
  dietaryTags: z.array(z.string()).optional(),
});

// ─── Type Exports ──────────────────────────────────────────────────────────────

export type AnalyzeFoodRequest = z.infer<typeof analyzeFoodRequestValidator>;
export type AnalyzeFoodResponse = z.infer<typeof analyzeFoodResponseValidator>;
export type FoodMacros = z.infer<typeof macrosValidator>;
