import { Router } from "express";
import authRoutes from "../../modules/auth/auth.routes";
import userRoutes from "../../modules/user/user.routes";
import dashboardRoutes from "../../modules/dashboard/dashboard.routes";
import foodRoutes from "../../modules/food/food.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/food", foodRoutes);

export default router;
