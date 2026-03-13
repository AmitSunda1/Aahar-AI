import express from "express";
import {
  signup,
  login,
  refresh,
  logout,
  getMe,
  verifyOtp,
  resendOtp,
} from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
