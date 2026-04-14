"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/signup", auth_controller_1.signup);
router.post("/login", auth_controller_1.login);
router.post("/verify-otp", auth_controller_1.verifyOtp);
router.post("/resend-otp", auth_controller_1.resendOtp);
router.post("/refresh", auth_controller_1.refresh);
router.post("/logout", auth_controller_1.logout);
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.getMe);
router.post("/change-password", auth_middleware_1.authenticate, auth_controller_1.changePassword);
exports.default = router;
