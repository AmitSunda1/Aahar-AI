import crypto from "crypto";

/**
 * Generates a cryptographically secure 6-digit OTP string.
 * Using crypto.randomInt ensures uniform distribution — safer than Math.random().
 */
export const generateOtp = (): string => {
    const otp = crypto.randomInt(100000, 999999);
    return otp.toString();
};
