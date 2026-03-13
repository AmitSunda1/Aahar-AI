import type { ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import { setStep } from "../onboardingSlice";
import { Button } from "../../../components/ui/Button";

interface StepShellProps {
  stepNumber: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
  /**
   * Show the Skip button that auto-advances to the next step.
   * Pass `onSkip` instead when skip needs custom logic (e.g. async save on the last step).
   */
  skippable?: boolean;
  /**
   * Custom skip handler. When provided the Skip button appears but StepShell will NOT
   * auto-advance — the handler is fully responsible for navigation (useful for Step 10).
   */
  onSkip?: () => void;
  /** Called right before StepShell auto-advances the step. Dispatch updateDraft here. */
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  continueLoading?: boolean;
  /**
   * Full footer override. Use only when the default Continue button is not suitable
   * (e.g. the final step with an async Finish action).
   */
  footer?: ReactNode;
  children: ReactNode;
}

export const StepShell = ({
  stepNumber,
  totalSteps = 10,
  title,
  subtitle,
  skippable,
  onSkip,
  onContinue,
  continueDisabled,
  continueLabel = "Continue",
  continueLoading,
  footer,
  children,
}: StepShellProps) => {
  const dispatch = useDispatch();
  const currentStep = useSelector((s: RootState) => s.onboarding.currentStep);
  const progress = (stepNumber / totalSteps) * 100;

  const handleBack = () => {
    if (currentStep > 1) dispatch(setStep(currentStep - 1));
  };

  const handleContinueClick = () => {
    onContinue?.();
    dispatch(setStep(stepNumber + 1));
  };

  const handleSkipClick = () => {
    if (onSkip) {
      onSkip(); // custom handler — responsible for its own navigation
    } else {
      dispatch(setStep(stepNumber + 1));
    }
  };

  const renderedFooter = footer ?? (
    <Button
      onClick={handleContinueClick}
      disabled={continueDisabled}
      loading={continueLoading}
      fullWidth
    >
      {continueLabel}
    </Button>
  );

  return (
    <div className="flex flex-col h-screen bg-base-black px-4 pt-4 max-w-app mx-auto overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        {stepNumber > 1 ? (
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full text-base-white hover:bg-grey-900 transition-colors"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="w-9" />
        )}

        {(skippable || onSkip) && (
          <button
            onClick={handleSkipClick}
            className="text-body text-grey-500 hover:text-grey-300 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-grey-900 rounded-full mb-8 flex-shrink-0">
        <div
          className="h-full bg-accent-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Heading */}
      <h1 className="text-h1 font-semibold text-base-white mb-2 flex-shrink-0">
        {title}
      </h1>
      {subtitle && (
        <p className="text-body text-grey-500 mb-8 flex-shrink-0">{subtitle}</p>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>

      {/* Pinned footer */}
      <div className="flex-shrink-0 pt-4 pb-8">{renderedFooter}</div>
    </div>
  );
};
