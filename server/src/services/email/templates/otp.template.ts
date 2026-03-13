/**
 * OTP verification email template.
 * Returns a ready-to-send HTML string.
 */
export function otpEmailTemplate(otp: string): string {
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
                Use the following code to verify your email address. This code is valid for <strong>10 minutes</strong>.
            </p>
            <div style="background-color: #F2F2F7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #0B0B0B;">
                    ${otp}
                </span>
            </div>
            <p style="font-size: 12px; color: #8E8E93; margin: 0;">
                If you didn't create an Aahar AI account, you can safely ignore this email.
            </p>
        </div>
    `;
}
