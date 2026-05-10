import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGetMeQuery,
} from "../../features/auth/authApi";
import { AuthCard, AuthShell } from "../../features/auth";

export const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email: string = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyOtp, { isLoading, error }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const { data: meData } = useGetMeQuery();

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (meData?.data?.user) {
    if (!meData.data.user.isCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (!email) {
    return <Navigate to="/signup" replace />;
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) return;
    try {
      const result = await verifyOtp({ email, otp: otpString }).unwrap();
      navigate(
        result.data.user.isCompletedOnboarding ? "/dashboard" : "/onboarding",
      );
    } catch (err) {
      console.error("OTP verification failed:", err);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await resendOtp({ email }).unwrap();
      setOtp(["", "", "", "", "", ""]);
      setCountdown(60);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error("Resend OTP failed:", err);
    }
  };

  const otpString = otp.join("");
  const isComplete = otpString.length === 6;

  return (
    <AuthShell>
      <AuthCard
        title="Check your email"
        subtitle="Enter the 6-digit code we sent to verify your account."
      >
        <div className="mb-6 rounded-[18px] border border-base-white/[0.08] bg-base-white/[0.05] px-4 py-3">
          <p className="text-[12px] uppercase tracking-[0.16em] text-grey-500">
            Sent to
          </p>
          <p className="mt-1 truncate text-[14px] font-semibold text-base-white">
            {email}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-[18px] border border-semantic-error/[0.35] bg-semantic-error/[0.12] px-4 py-3 text-[13px] leading-5 text-semantic-error animate-soft-rise">
            {(error as any)?.data?.message || "Invalid OTP. Please try again."}
          </div>
        )}

        <div className="mb-6 grid grid-cols-6 gap-2" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-[52px] min-w-0 w-full rounded-[16px] border border-base-white/10 bg-base-white/[0.07] text-center text-[18px] font-semibold text-base-white outline-none transition-all focus:border-accent-primary/70 focus:bg-base-white/[0.1] focus:ring-4 focus:ring-accent-primary/15"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={!isComplete || isLoading}
          className="mb-6 h-[52px] w-full rounded-full bg-accent-primary text-[15px] font-semibold text-base-white shadow-[0_14px_34px_rgba(11,95,255,0.35)] transition-all hover:bg-[#245fff] disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]"
        >
          {isLoading ? "Verifying..." : "Verify Email"}
        </button>

        <p className="text-center text-[13px] leading-5 text-grey-300">
          Didn't receive it?{" "}
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="font-semibold text-base-white transition-colors hover:text-accent-primary disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          ) : (
            <span className="text-grey-500">Resend in {countdown}s</span>
          )}
        </p>
      </AuthCard>
    </AuthShell>
  );
};
