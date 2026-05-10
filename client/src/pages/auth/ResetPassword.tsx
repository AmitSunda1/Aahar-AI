import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useResetPasswordMutation } from "../../features/auth/authApi";
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

export const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") || "";
  }, [location.search]);

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordMismatch) {
      return;
    }

    try {
      const result = await resetPassword({ token, newPassword }).unwrap();
      navigate(
        result.data.user.isCompletedOnboarding ? "/dashboard" : "/onboarding",
      );
    } catch (err) {
      console.error("Reset password failed:", err);
    }
  };

  const resetPasswordError = getApiErrorMessage(
    error,
    "Failed to reset password. Please try again.",
  );

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <AuthShell>
      <AuthCard
        title="Set new password"
        subtitle="Choose a strong password to protect your nutrition and progress data."
      >
        {resetPasswordError && (
          <div className="mb-4 rounded-[18px] border border-semantic-error/[0.35] bg-semantic-error/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-error animate-soft-rise">
            {resetPasswordError}
          </div>
        )}

        {passwordMismatch && (
          <div className="mb-4 rounded-[18px] border border-semantic-error/[0.35] bg-semantic-error/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-error animate-soft-rise">
            Passwords do not match.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className={fieldClass}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className={labelClass}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className={fieldClass}
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || passwordMismatch}
            className="h-[52px] w-full rounded-full bg-accent-primary text-[15px] font-semibold text-base-white shadow-[0_14px_34px_rgba(11,95,255,0.35)] transition-all hover:bg-[#245fff] disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
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
