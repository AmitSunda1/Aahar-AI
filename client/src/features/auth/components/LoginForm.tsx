import { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useLoginMutation, useGetMeQuery } from "../authApi";
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

    if (status === 401) {
      return "Incorrect email or password.";
    }

    if (status === 403) {
      return "Please verify your email first, then sign in.";
    }
  }

  return fallback;
};

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const routeAuthError = (location.state as { authError?: string } | null)
    ?.authError;

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
      const result = await login({ email, password }).unwrap();

      if (!result.data.user.isCompletedOnboarding) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const loginError =
    getApiErrorMessage(error, "Failed to login. Please try again.") ||
    routeAuthError;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue tracking your meals, workouts, and daily progress."
    >
      {loginError && (
        <div className="mb-4 rounded-[18px] border border-semantic-error/[0.35] bg-semantic-error/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-error animate-soft-rise">
          {loginError}
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
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-grey-400">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] font-semibold text-accent-primary transition-colors hover:text-base-white"
            >
              Reset
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={fieldClass}
            placeholder="Your password"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="h-[52px] w-full rounded-full bg-accent-primary text-[15px] font-semibold text-base-white shadow-[0_14px_34px_rgba(11,95,255,0.35)] transition-all hover:bg-[#245fff] disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-[20px] border border-base-white/[0.08] bg-base-white/[0.04] px-4 py-3 text-center">
        <p className="text-[13px] leading-5 text-grey-300">
          New to Aahar AI?{" "}
          <Link
            to="/signup"
            className="font-semibold text-base-white transition-colors hover:text-accent-primary"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};
