import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.config";
import AppError from "../../utils/appError";
import { rateLimitManager } from "./rateLimitManager";
import {
  geminiMealPlanValidator,
  geminiPlanResponseValidator,
  type GeminiMealPlanResponse,
  type GeminiPlanResponse,
} from "../../validators/dashboard.validator";

const stripJsonFence = (raw: string): string =>
  raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

export const isGeminiConfigured = (): boolean => Boolean(env.GEMINI_API_KEY);

export const generatePlanWithGemini = async (
  prompt: string,
): Promise<{ plan: GeminiPlanResponse; rawResponse: string }> => {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      "GEMINI_API_KEY is not configured on the server",
      500,
      "GEMINI_NOT_CONFIGURED",
    );
  }

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: env.GEMINI_MODEL });

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const rawResponse = result.response.text();
    const parsed = JSON.parse(stripJsonFence(rawResponse));
    const validated = geminiPlanResponseValidator.safeParse(parsed);

    if (!validated.success) {
      throw new AppError(
        validated.error.issues[0]?.message || "Invalid Gemini plan response",
        502,
        "INVALID_GEMINI_RESPONSE",
      );
    }

    return { plan: validated.data, rawResponse };
  } catch (error) {
    if (error instanceof AppError) throw error;

    const message =
      error instanceof Error ? error.message : "Gemini request failed";

    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      throw new AppError(message, 429, "GEMINI_QUOTA_EXCEEDED");
    }

    throw new AppError(message, 502, "GEMINI_GENERATION_FAILED");
  }
};

/**
 * Generate a structured 7-day weekly meal plan via Gemini.
 * Validates the response against geminiMealPlanValidator.
 */
export const generateMealPlanWithGemini = async (
  prompt: string,
): Promise<{ plan: GeminiMealPlanResponse; rawResponse: string }> => {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      "GEMINI_API_KEY is not configured on the server",
      500,
      "GEMINI_NOT_CONFIGURED",
    );
  }

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: env.GEMINI_MODEL });

  try {
    const executeGeneration = async () => {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
        },
      });

      const rawResponse = result.response.text();
      const parsed = JSON.parse(stripJsonFence(rawResponse));
      const validated = geminiMealPlanValidator.safeParse(parsed);

      if (!validated.success) {
        throw new AppError(
          validated.error.issues[0]?.message ||
            "Invalid Gemini meal plan response",
          502,
          "INVALID_GEMINI_RESPONSE",
        );
      }

      return { plan: validated.data, rawResponse };
    };

    return await rateLimitManager.executeWithRetry(
      executeGeneration,
      "Gemini weekly meal plan generation",
    );
  } catch (error) {
    if (error instanceof AppError) throw error;

    const message =
      error instanceof Error
        ? error.message
        : "Gemini meal plan request failed";

    if (
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.toLowerCase().includes("resource exhausted") ||
      message.toLowerCase().includes("rate limit") ||
      message.toLowerCase().includes("overloaded") ||
      message.toLowerCase().includes("busy")
    ) {
      throw new AppError(message, 429, "GEMINI_QUOTA_EXCEEDED");
    }

    throw new AppError(message, 502, "GEMINI_GENERATION_FAILED");
  }
};
