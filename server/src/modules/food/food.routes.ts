import express from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  analyzeFoodHandler,
  analyzeFoodTextHandler,
  logFoodHandler,
} from "./food.controller";

const router = express.Router();

router.use(authenticate);

// Analyze food image and extract nutritional content
router.post("/analyze", analyzeFoodHandler);
router.post("/describe", analyzeFoodTextHandler);

// Log analyzed food to daily progress
router.post("/log", logFoodHandler);

export default router;
