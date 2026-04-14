import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useSignupMutation, useGetMeQuery } from "../authApi";

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
    <div className="w-full max-w-md p-6 bg-base-black/80 backdrop-blur-md rounded-card border border-grey-700 w-[90%] mx-auto mt-auto mb-12 shadow-card-lg relative z-10">
      <h2 className="mb-6 text-h2 font-bold text-center text-base-white">
        Create Account
      </h2>

      {signupError && (
        <div className="p-3 mb-4 text-body-sm text-semantic-error bg-semantic-error/10 border border-semantic-error rounded-input">
          {signupError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-label-sm text-grey-300 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 h-12 bg-base-black/50 border border-grey-700 rounded-input text-base-white placeholder-grey-500 focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none transition-colors"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label className="block mb-1 text-label-sm text-grey-300 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 h-12 bg-base-black/50 border border-grey-700 rounded-input text-base-white placeholder-grey-500 focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none transition-colors"
            placeholder="Create a password (min 6 chars)"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 mt-2 font-semibold text-[14px] leading-[20px] text-base-white bg-accent-primary rounded-full hover:bg-accent-primary/90 disabled:opacity-50 transition-colors shadow-card-md"
        >
          {isLoading ? "Signing up..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-body-sm text-center text-grey-300">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-base-white font-medium hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
};
