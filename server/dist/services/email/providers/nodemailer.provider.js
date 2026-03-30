"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodemailerProvider = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_config_1 = require("../../../config/env.config");
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: env_config_1.env.EMAIL_USER,
        pass: env_config_1.env.EMAIL_APP_PASSWORD,
    },
});
exports.nodemailerProvider = {
    async send(options) {
        await transporter.sendMail({
            from: `"Aahar AI" <${env_config_1.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
    },
};
