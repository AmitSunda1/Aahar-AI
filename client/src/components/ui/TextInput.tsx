import type { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Extra classes appended after the base styles */
  className?: string;
}

/**
 * Dark-themed text input matching the app design system.
 * Drop-in replacement for raw <input> elements across onboarding steps.
 */
export const TextInput = ({ className = "", ...props }: TextInputProps) => (
  <input
    {...props}
    className={`w-full h-14 px-4 bg-grey-900 rounded-card text-base-white placeholder-grey-500 text-body-lg outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all ${className}`}
  />
);
