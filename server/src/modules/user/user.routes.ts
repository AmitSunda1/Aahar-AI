import express from "express";
import { saveOnboarding, getOnboarding } from "./user.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get("/onboarding", getOnboarding);
router.patch("/onboarding", saveOnboarding);

export default router;
