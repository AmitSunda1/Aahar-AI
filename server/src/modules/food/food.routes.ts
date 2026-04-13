import express from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { analyzeFoodHandler, logFoodHandler } from "./food.controller";

const router = express.Router();

router.use(authenticate);

// Analyze food image and extract nutritional content
router.post("/analyze", analyzeFoodHandler);

// Log analyzed food to daily progress
router.post("/log", logFoodHandler);

export default router;
