"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetPasswordEmail = exports.sendOtpEmail = exports.sendMail = void 0;
const nodemailer_provider_1 = require("./providers/nodemailer.provider");
const otp_template_1 = require("./templates/otp.template");
const reset_password_template_1 = require("./templates/reset-password.template");
// ─── Active provider ──────────────────────────────────────────────────────────
// Swap this single line to switch email infrastructure (e.g. SendGrid, Resend).
const provider = nodemailer_provider_1.nodemailerProvider;
// ─── Core send function ───────────────────────────────────────────────────────
const sendMail = async (options) => {
    await provider.send(options);
};
exports.sendMail = sendMail;
// ─── Template helpers ─────────────────────────────────────────────────────────
const sendOtpEmail = async (to, otp) => {
    await (0, exports.sendMail)({
        to,
        subject: "Your Aahar AI Verification Code",
        html: (0, otp_template_1.otpEmailTemplate)(otp),
    });
};
exports.sendOtpEmail = sendOtpEmail;
const sendResetPasswordEmail = async (to, resetLink) => {
    await (0, exports.sendMail)({
        to,
        subject: "Reset your Aahar AI password",
        html: (0, reset_password_template_1.resetPasswordEmailTemplate)(resetLink),
    });
};
exports.sendResetPasswordEmail = sendResetPasswordEmail;
