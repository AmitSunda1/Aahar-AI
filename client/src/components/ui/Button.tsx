import type { ReactNode } from "react";

interface ButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: "primary" | "ghost" | "outline";
    size?: "md" | "lg";
    /** Makes the button fill its container width */
    fullWidth?: boolean;
    type?: "button" | "submit";
    className?: string;
    children: ReactNode;
}

export const Button = ({
    onClick,
    disabled = false,
    loading = false,
    variant = "primary",
    size = "lg",
    fullWidth = false,
    type = "button",
    className = "",
    children,
}: ButtonProps) => {
    const base =
        "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-card active:scale-[0.98] focus:outline-none";

    const sizes: Record<string, string> = {
        md: "h-12 px-5 text-body",
        lg: "h-14 px-6 text-body-lg",
    };

    const variants: Record<string, string> = {
        primary: disabled || loading
            ? "bg-grey-900 text-grey-500 cursor-not-allowed"
            : "bg-base-white text-base-black hover:bg-grey-100",
        ghost: "bg-transparent text-grey-300 hover:text-base-white",
        outline: disabled || loading
            ? "border border-grey-700 text-grey-500 cursor-not-allowed"
            : "border border-grey-700 text-base-white hover:border-grey-500",
    };

    return (
        <button
            type={type}
            onClick={disabled || loading ? undefined : onClick}
            disabled={disabled || loading}
            className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Loading...
                </span>
            ) : children}
        </button>
    );
};
