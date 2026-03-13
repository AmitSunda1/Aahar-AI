import nodemailer from "nodemailer";
import { env } from "../../../config/env.config";
import type { EmailProvider, MailOptions } from "../email.service";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_APP_PASSWORD,
  },
});

export const nodemailerProvider: EmailProvider = {
  async send(options: MailOptions): Promise<void> {
    await transporter.sendMail({
      from: `"Aahar AI" <${env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  },
};
