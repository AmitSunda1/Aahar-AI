"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["staging", "production", "development"])
        .default("development"),
    PORT: zod_1.z.string().transform(Number).default(8000),
    MONGO_URI: zod_1.z.string().min(1, "MONGO_URI is required"),
    FRONTEND_URL: zod_1.z.string().url("FRONTEND_URL must be a valid URL"),
    FRONTEND_URLS: zod_1.z
        .string()
        .optional()
        .transform((value) => {
        if (!value)
            return [];
        return value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean);
    })
        .refine((origins) => origins.every((origin) => zod_1.z.string().url().safeParse(origin).success), "FRONTEND_URLS must be a comma-separated list of valid URLs"),
    JWT_ACCESS_SECRET: zod_1.z
        .string()
        .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: zod_1.z
        .string()
        .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().optional().default("15m"),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().optional().default("7d"),
    EMAIL_USER: zod_1.z.string().email("EMAIL_USER must be a valid email"),
    EMAIL_APP_PASSWORD: zod_1.z.string().min(1, "EMAIL_APP_PASSWORD is required"),
    GEMINI_API_KEY: zod_1.z.string().min(1).optional(),
    GEMINI_MODEL: zod_1.z.string().min(1).optional().default("gemini-2.0-flash"),
});
/**
 * Validate environment variables
 * This will crash the application if any required variable is missing or invalid
 */
function validateEnv() {
    try {
        const parsed = envSchema.safeParse(process.env);
        if (!parsed.success) {
            console.error("Invalid or missing environment variables:\n");
            parsed.error.issues.forEach((issue) => {
                console.error(`  ❌ ${issue.path.join(".")}: ${issue.message}`);
            });
            console.error("\n⚠️  Please check your .env file and ensure all required variables are set correctly.\n");
            process.exit(1);
        }
        return parsed.data;
    }
    catch (error) {
        console.error("\n❌ ENVIRONMENT CONFIGURATION ERROR\n");
        console.error(error);
        process.exit(1);
    }
}
/**
 * Validated and typed environment configuration
 * Import this instead of using process.env directly
 */
exports.env = validateEnv();
// Log successful validation in development
if (exports.env.NODE_ENV === "development") {
    console.log("✓ Environment variables validated successfully");
}
