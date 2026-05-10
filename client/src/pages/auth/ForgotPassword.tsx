import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../../features/auth/authApi";
import { AuthCard, AuthShell } from "../../features/auth";

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

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
      setSubmitted(true);
    } catch (err) {
      console.error("Forgot password failed:", err);
    }
  };

  const forgotPasswordError = getApiErrorMessage(
    error,
    "Failed to send reset link. Please try again.",
  );

  return (
    <AuthShell>
      <AuthCard
        title="Reset password"
        subtitle="Enter your verified email and we will send a secure reset link."
      >
        {submitted && (
          <div className="mb-4 rounded-[18px] border border-semantic-success/[0.35] bg-semantic-success/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-success animate-soft-rise">
            Password reset link sent to your email.
          </div>
        )}

        {forgotPasswordError && (
          <div className="mb-4 rounded-[18px] border border-semantic-error/[0.35] bg-semantic-error/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-error animate-soft-rise">
            {forgotPasswordError}
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
          <button
            type="submit"
            disabled={isLoading}
            className="h-[52px] w-full rounded-full bg-accent-primary text-[15px] font-semibold text-base-white shadow-[0_14px_34px_rgba(11,95,255,0.35)] transition-all hover:bg-[#245fff] disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] leading-5 text-grey-300">
          Back to{" "}
          <Link
            to="/login"
            className="font-semibold text-base-white transition-colors hover:text-accent-primary"
          >
            sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
};
