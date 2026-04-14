import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useResetPasswordMutation } from "../../features/auth/authApi";
import splashBg from "../../assets/Sign-up-img.webp";

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
    <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src={splashBg}
          alt="Fitness Background"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </div>

      <div className="w-full max-w-md p-6 bg-base-black/80 backdrop-blur-md rounded-card border border-grey-700 w-[90%] mx-auto mt-auto mb-12 shadow-card-lg relative z-10">
        <h2 className="mb-2 text-h2 font-bold text-center text-base-white">
          Reset Password
        </h2>
        <p className="mb-6 text-body-sm text-center text-grey-300">
          Set a new password for your account.
        </p>

        {resetPasswordError && (
          <div className="p-3 mb-4 text-body-sm text-semantic-error bg-semantic-error/10 border border-semantic-error rounded-input">
            {resetPasswordError}
          </div>
        )}

        {passwordMismatch && (
          <div className="p-3 mb-4 text-body-sm text-semantic-error bg-semantic-error/10 border border-semantic-error rounded-input">
            Passwords do not match.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-label-sm text-grey-300 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 h-12 bg-base-black/50 border border-grey-700 rounded-input text-base-white placeholder-grey-500 focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none transition-colors"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block mb-1 text-label-sm text-grey-300 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 h-12 bg-base-black/50 border border-grey-700 rounded-input text-base-white placeholder-grey-500 focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none transition-colors"
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || passwordMismatch}
            className="w-full h-12 mt-2 font-semibold text-[14px] leading-[20px] text-base-white bg-accent-primary rounded-full hover:bg-accent-primary/90 disabled:opacity-50 transition-colors shadow-card-md"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="mt-6 text-body-sm text-center text-grey-300">
          Back to{" "}
          <Link
            to="/login"
            className="text-base-white font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};
