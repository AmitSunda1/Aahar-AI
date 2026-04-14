"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboard_controller_1 = require("./dashboard.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.get("/home", dashboard_controller_1.getHomeDashboard);
router.post("/plan/generate", dashboard_controller_1.generateDashboardPlan);
router.patch("/progress/today", dashboard_controller_1.updateTodayDashboardProgress);
router.post("/workout/complete", dashboard_controller_1.completeWorkoutSession);
router.get("/meal-plan/today", dashboard_controller_1.getTodayMealPlanHandler);
router.get("/meal-plan/week", dashboard_controller_1.getWeeklyMealPlanHandler);
exports.default = router;
