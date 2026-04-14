"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordEmailTemplate = resetPasswordEmailTemplate;
/**
 * Reset password email template.
 * Returns a ready-to-send HTML string.
 */
function resetPasswordEmailTemplate(resetLink) {
    return `
        <div style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #D1D1D6;">
            <h1 style="font-size: 22px; font-weight: 600; color: #0B0B0B; margin-bottom: 8px;">
                Aahar AI
            </h1>
            <p style="font-size: 14px; color: #4A4A4A; margin-bottom: 32px;">
                Your personal nutrition &amp; fitness coach for Indian lifestyles.
            </p>
            <hr style="border: none; border-top: 1px solid #D1D1D6; margin-bottom: 24px;" />
            <p style="font-size: 14px; color: #4A4A4A; margin-bottom: 16px;">
                We received a request to reset your password. This link is valid for <strong>15 minutes</strong>.
            </p>
            <a
                href="${resetLink}"
                style="display: inline-block; background-color: #0B5FFF; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; margin-bottom: 20px;"
            >
                Reset Password
            </a>
            <p style="font-size: 12px; color: #8E8E93; margin: 0 0 6px 0;">
                If the button does not work, copy this link into your browser:
            </p>
            <p style="font-size: 12px; color: #4A4A4A; word-break: break-all; margin: 0 0 18px 0;">
                ${resetLink}
            </p>
            <p style="font-size: 12px; color: #8E8E93; margin: 0;">
                If you did not request a password reset, you can safely ignore this email.
            </p>
        </div>
    `;
}
