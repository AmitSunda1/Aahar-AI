import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForgotPasswordMutation } from "../../features/auth/authApi";
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

export const ForgotPassword = () => {
  const navigate = useNavigate();
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
    <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
      {/* Header / Back Button */}
      <div className="absolute top-0 left-0 w-full px-6 pt-12 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-1 py-2 rounded-full bg-transparent text-base-white hover:text-grey-300 transition-all active:scale-[0.96] animate-soft-drop"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span className="text-[15px] font-medium">Back</span>
        </button>
      </div>

      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src={splashBg}
          alt="Fitness Background"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </div>

      <div className="w-full max-w-md p-6 bg-base-black/80 backdrop-blur-md rounded-card border border-grey-700 w-[90%] mx-auto mt-auto mb-12 shadow-card-lg relative z-10 animate-soft-rise">
        <h2 className="mb-2 text-h2 font-bold text-center text-base-white">
          Forgot Password
        </h2>
        <p className="mb-6 text-body-sm text-center text-grey-300">
          Enter your verified email and we'll send you a reset link.
        </p>

        {submitted && (
          <div className="p-3 mb-4 text-body-sm text-semantic-success bg-semantic-success/10 border border-semantic-success rounded-input animate-soft-rise">
            Password reset link sent to your email.
          </div>
        )}

        {forgotPasswordError && (
          <div className="p-3 mb-4 text-body-sm text-semantic-error bg-semantic-error/10 border border-semantic-error rounded-input animate-soft-rise">
            {forgotPasswordError}
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
              className="w-full px-4 h-12 bg-base-black/50 border border-grey-700 rounded-input text-base-white placeholder-grey-500 focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 font-semibold text-[14px] leading-[20px] text-base-white bg-accent-primary rounded-full hover:bg-accent-primary/90 disabled:opacity-50 transition-all active:scale-[0.98] shadow-card-md"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
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
