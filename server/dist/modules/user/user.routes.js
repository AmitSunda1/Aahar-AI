"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
// All user routes require authentication
router.use(auth_middleware_1.authenticate);
router.get("/onboarding", user_controller_1.getOnboarding);
router.patch("/onboarding", user_controller_1.saveOnboarding);
exports.default = router;
