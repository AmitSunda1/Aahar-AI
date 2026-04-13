"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const food_controller_1 = require("./food.controller");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
// Analyze food image and extract nutritional content
router.post("/analyze", food_controller_1.analyzeFoodHandler);
// Log analyzed food to daily progress
router.post("/log", food_controller_1.logFoodHandler);
exports.default = router;
