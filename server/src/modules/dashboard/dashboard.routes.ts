import express from "express";
import {
  completeWorkoutSession,
  generateDashboardPlan,
  getHomeDashboard,
  updateTodayDashboardProgress,
  getTodayMealPlanHandler,
  getWeeklyMealPlanHandler,
} from "./dashboard.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = express.Router();

router.use(authenticate);
router.get("/home", getHomeDashboard);
router.post("/plan/generate", generateDashboardPlan);
router.patch("/progress/today", updateTodayDashboardProgress);
router.post("/workout/complete", completeWorkoutSession);
router.get("/meal-plan/today", getTodayMealPlanHandler);
router.get("/meal-plan/week", getWeeklyMealPlanHandler);

export default router;
