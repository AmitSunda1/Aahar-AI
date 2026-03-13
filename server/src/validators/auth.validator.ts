import { z } from "zod";

export const signupValidator = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginValidator = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpValidator = z.object({
  email: z.string().email("Please provide a valid email"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export const resendOtpValidator = z.object({
  email: z.string().email("Please provide a valid email"),
});
