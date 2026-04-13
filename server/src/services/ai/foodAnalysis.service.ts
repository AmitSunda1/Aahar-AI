import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.config";
import AppError from "../../utils/appError";
import { rateLimitManager } from "./rateLimitManager";
import { optimizeImageForGemini } from "./imageOptimization.service";
import {
  analyzeFoodResponseValidator,
  type AnalyzeFoodRequest,
  type AnalyzeFoodResponse,
} from "../../validators/foodAnalysis.validator";

const stripJsonFence = (raw: string): string =>
  raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

/**
 * Analyze food image using Gemini Vision API
 * Returns nutritional content (calories, macros) based on image + description
 * Implements rate limiting and retry logic for quota management
 */
export const analyzeFoodImage = async (
  imageBase64: string,
  mimeType: string,
  request: AnalyzeFoodRequest,
): Promise<AnalyzeFoodResponse> => {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      "GEMINI_API_KEY is not configured on the server",
      500,
      "GEMINI_NOT_CONFIGURED",
    );
  }

  try {
    // Use rate limit manager with retry and backoff logic
    const response = await rateLimitManager.executeWithRetry(
      () =>
        performGeminiAnalysis(imageBase64, mimeType, request),
      "Food image analysis",
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check for specific error types
    if (message.includes("quota") || message.includes("429")) {
      throw new AppError(
        "Gemini API quota exceeded. Please try again in a few moments.",
        429,
        "GEMINI_QUOTA_EXCEEDED",
      );
    }

    if (message.includes("INVALID_ARGUMENT")) {
      throw new AppError(
        "Invalid image format. Please use JPG, PNG, GIF, or WebP",
        400,
        "INVALID_IMAGE_FORMAT",
      );
    }

    throw new AppError(message, 502, "GEMINI_ANALYSIS_FAILED");
  }
};

/**
 * Perform the actual Gemini API call
 */
async function performGeminiAnalysis(
  imageBase64: string,
  mimeType: string,
  request: AnalyzeFoodRequest,
): Promise<AnalyzeFoodResponse> {
  // Optimize image before sending to Gemini (reduces token usage)
  const { optimizedBase64, stats } = await optimizeImageForGemini(
    imageBase64,
    mimeType,
  );

  console.log(
    `[Food Analysis] Image optimization: ${stats.originalSizeKb}KB → ${stats.optimizedSizeKb}KB (${stats.compressionRatio}% reduction)`,
  );

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: env.GEMINI_MODEL });

  const prompt = buildFoodAnalysisPrompt(request);

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/webp", // Optimized image is now WebP
              data: optimizedBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const rawResponse = result.response.text();
  const parsed = JSON.parse(stripJsonFence(rawResponse));
  const validated = analyzeFoodResponseValidator.safeParse(parsed);

  if (!validated.success) {
    console.error("Validation error:", validated.error.issues);
    throw new AppError(
      validated.error.issues[0]?.message || "Invalid Gemini food analysis response",
      502,
      "INVALID_GEMINI_RESPONSE",
    );
  }

  return validated.data;
}

/**
 * Build a detailed prompt for Gemini to analyze food nutritional content
 */
function buildFoodAnalysisPrompt(request: AnalyzeFoodRequest): string {
  const quantityInfo = request.quantity
    ? `Quantity: ${request.quantity}${request.unit || ""}`
    : "Quantity: Not specified (estimate based on typical serving)";

  const notesInfo = request.notes ? `\nAdditional notes: ${request.notes}` : "";

  return `You are a nutritionist AI assistant specializing in food analysis. 

Analyze the food image and the description provided. Your task is to:
1. Identify the food item(s)
2. Estimate nutritional content based on the image and description
3. Return accurate macro and micronutrient information

Food Description: ${request.description}
${quantityInfo}${notesInfo}

Please analyze this food and return a JSON response with:
- foodName: The name of the food item
- description: A brief description of what's in the food
- macros: {
    calories: estimated calories,
    protein: grams of protein,
    carbs: grams of carbohydrates,
    fat: grams of fat,
    fiber: grams of fiber (optional),
    sugar: grams of sugar (optional)
  }
- confidence: "high", "medium", or "low" (based on how clear the image is and your certainty)
- servingSize: The serving size used for the calculation (e.g., "100g", "1 cup")
- additionalInfo: Any other relevant nutritional or health information
- dietaryTags: Array of tags like ["vegetarian", "high-protein", "low-carb"] if applicable

Ensure all returned values are realistic and based on standard nutritional databases. If the description mentions quantity/weight, use that for calculation. Be conservative with estimates if the image is unclear.`;
}
