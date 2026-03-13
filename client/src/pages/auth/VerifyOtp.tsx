import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGetMeQuery,
} from "../../features/auth/authApi";
import splashBg from "../../assets/Sign-up-img.webp";

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
  if (meData?.data?.user) {
    if (!meData.data.user.isCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (!email) {
    return <Navigate to="/signup" replace />;
  }

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

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
    <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src={splashBg}
          alt="Fitness Background"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
      </div>

      <div className="relative z-10 w-[90%] mx-auto mb-12 p-6 bg-base-black/80 backdrop-blur-md rounded-card border border-grey-700 shadow-card-lg">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-grey-300 text-[13px] mb-6 hover:text-base-white transition-colors gap-1"
        >
          ← Back
        </button>
        <h2 className="text-[22px] leading-[30px] font-semibold text-base-white mb-2">
          Check your email
        </h2>
        <p className="text-[14px] leading-[22px] text-grey-300 mb-8">
          We sent a 6-digit code to{" "}
          <span className="text-base-white font-medium">{email}</span>
        </p>

        {error && (
          <div className="p-3 mb-4 text-[13px] text-semantic-error bg-semantic-error/10 border border-semantic-error rounded-input">
            {(error as any)?.data?.message || "Invalid OTP. Please try again."}
          </div>
        )}

        <div className="flex gap-2 justify-between mb-8" onPaste={handlePaste}>
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
              className="w-12 h-14 text-center text-[20px] font-semibold bg-base-black/50 border border-grey-700 rounded-input text-base-white focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none transition-colors"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={!isComplete || isLoading}
          className="w-full h-12 font-semibold text-[14px] leading-[20px] text-base-white bg-accent-primary rounded-full hover:bg-accent-primary/90 disabled:opacity-40 transition-colors shadow-card-md mb-6"
        >
          {isLoading ? "Verifying..." : "Verify Email"}
        </button>

        <p className="text-center text-[13px] text-grey-300">
          Didn't receive it?{" "}
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-base-white font-medium hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          ) : (
            <span className="text-grey-500">Resend in {countdown}s</span>
          )}
        </p>
      </div>
    </div>
  );
};
