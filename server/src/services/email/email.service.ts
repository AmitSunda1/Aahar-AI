import { nodemailerProvider } from "./providers/nodemailer.provider";
import { otpEmailTemplate } from "./templates/otp.template";
import { resetPasswordEmailTemplate } from "./templates/reset-password.template";

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(options: MailOptions): Promise<void>;
}

// ─── Active provider ──────────────────────────────────────────────────────────
// Swap this single line to switch email infrastructure (e.g. SendGrid, Resend).

const provider: EmailProvider = nodemailerProvider;

// ─── Core send function ───────────────────────────────────────────────────────

export const sendMail = async (options: MailOptions): Promise<void> => {
  await provider.send(options);
};

// ─── Template helpers ─────────────────────────────────────────────────────────

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  await sendMail({
    to,
    subject: "Your Aahar AI Verification Code",
    html: otpEmailTemplate(otp),
  });
};

export const sendResetPasswordEmail = async (
  to: string,
  resetLink: string,
): Promise<void> => {
  await sendMail({
    to,
    subject: "Reset your Aahar AI password",
    html: resetPasswordEmailTemplate(resetLink),
  });
};
