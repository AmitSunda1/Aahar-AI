"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMealPlanWithGemini = exports.generatePlanWithGemini = exports.isGeminiConfigured = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_config_1 = require("../../config/env.config");
const appError_1 = __importDefault(require("../../utils/appError"));
const dashboard_validator_1 = require("../../validators/dashboard.validator");
const stripJsonFence = (raw) => raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
const isGeminiConfigured = () => Boolean(env_config_1.env.GEMINI_API_KEY);
exports.isGeminiConfigured = isGeminiConfigured;
const generatePlanWithGemini = async (prompt) => {
    if (!env_config_1.env.GEMINI_API_KEY) {
        throw new appError_1.default("GEMINI_API_KEY is not configured on the server", 500, "GEMINI_NOT_CONFIGURED");
    }
    const client = new generative_ai_1.GoogleGenerativeAI(env_config_1.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: env_config_1.env.GEMINI_MODEL });
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
        const validated = dashboard_validator_1.geminiPlanResponseValidator.safeParse(parsed);
        if (!validated.success) {
            throw new appError_1.default(validated.error.issues[0]?.message || "Invalid Gemini plan response", 502, "INVALID_GEMINI_RESPONSE");
        }
        return { plan: validated.data, rawResponse };
    }
    catch (error) {
        if (error instanceof appError_1.default)
            throw error;
        const message = error instanceof Error ? error.message : "Gemini request failed";
        if (message.includes("429") || message.toLowerCase().includes("quota")) {
            throw new appError_1.default(message, 429, "GEMINI_QUOTA_EXCEEDED");
        }
        throw new appError_1.default(message, 502, "GEMINI_GENERATION_FAILED");
    }
};
exports.generatePlanWithGemini = generatePlanWithGemini;
/**
 * Generate a structured 7-day weekly meal plan via Gemini.
 * Validates the response against geminiMealPlanValidator.
 */
const generateMealPlanWithGemini = async (prompt) => {
    if (!env_config_1.env.GEMINI_API_KEY) {
        throw new appError_1.default("GEMINI_API_KEY is not configured on the server", 500, "GEMINI_NOT_CONFIGURED");
    }
    const client = new generative_ai_1.GoogleGenerativeAI(env_config_1.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: env_config_1.env.GEMINI_MODEL });
    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.5,
                responseMimeType: "application/json",
            },
        });
        const rawResponse = result.response.text();
        const parsed = JSON.parse(stripJsonFence(rawResponse));
        const validated = dashboard_validator_1.geminiMealPlanValidator.safeParse(parsed);
        if (!validated.success) {
            throw new appError_1.default(validated.error.issues[0]?.message ||
                "Invalid Gemini meal plan response", 502, "INVALID_GEMINI_RESPONSE");
        }
        return { plan: validated.data, rawResponse };
    }
    catch (error) {
        if (error instanceof appError_1.default)
            throw error;
        const message = error instanceof Error
            ? error.message
            : "Gemini meal plan request failed";
        if (message.includes("429") || message.toLowerCase().includes("quota")) {
            throw new appError_1.default(message, 429, "GEMINI_QUOTA_EXCEEDED");
        }
        throw new appError_1.default(message, 502, "GEMINI_GENERATION_FAILED");
    }
};
exports.generateMealPlanWithGemini = generateMealPlanWithGemini;
