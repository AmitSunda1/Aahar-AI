import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useSignupMutation, useGetMeQuery } from "../authApi";
import { AuthCard } from "./AuthShell";

const fieldClass =
  "h-[52px] w-full rounded-[18px] border border-base-white/10 bg-base-white/[0.07] px-4 text-[15px] text-base-white placeholder:text-grey-500 outline-none transition-all focus:border-accent-primary/70 focus:bg-base-white/[0.1] focus:ring-4 focus:ring-accent-primary/15";

const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-grey-400";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("status" in error) {
    const status = (error as { status?: number | string }).status;
    const dataMessage = (error as { data?: { message?: string } })?.data
      ?.message;

    if (dataMessage) return dataMessage;

    if (status === "FETCH_ERROR") {
      return "Unable to reach the server. Please check your internet connection and try again.";
    }
  }

  return fallback;
};

export const SignupForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, { isLoading, error }] = useSignupMutation();
  const navigate = useNavigate();

  const { data: meData } = useGetMeQuery();
  if (meData?.data?.user) {
    if (!meData.data.user.isCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({ email, password }).unwrap();
      // Signup now sends OTP — redirect to verification page with the email in state
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      console.error("Signup failed:", err);
    }
  };

  const signupError = getApiErrorMessage(
    error,
    "Failed to sign up. Please try again.",
  );

  return (
    <AuthCard
      title="Create account"
      subtitle="Start with email verification, then we will personalize nutrition around your routine."
    >
      {signupError && (
        <div className="mb-4 rounded-[18px] border border-semantic-error/[0.35] bg-semantic-error/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-error animate-soft-rise">
          {signupError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={fieldClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className={labelClass}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={fieldClass}
            placeholder="Minimum 6 characters"
          />
          <p className="mt-2 text-[12px] leading-5 text-grey-500">
            Use at least 6 characters. You can change this later.
          </p>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="h-[52px] w-full rounded-full bg-accent-primary text-[15px] font-semibold text-base-white shadow-[0_14px_34px_rgba(11,95,255,0.35)] transition-all hover:bg-[#245fff] disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 rounded-[20px] border border-base-white/[0.08] bg-base-white/[0.04] px-4 py-3 text-center">
        <p className="text-[13px] leading-5 text-grey-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-base-white transition-colors hover:text-accent-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};
