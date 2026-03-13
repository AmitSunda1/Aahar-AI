interface OptionRowProps {
    label: string;
    sublabel?: string;
    value: string;
    selected: boolean;
    /** "radio" = single select circle. "checkbox" = multi-select square. Default: "radio" */
    type?: "radio" | "checkbox";
    onSelect: (value: string) => void;
}

export const OptionRow = ({
    label,
    sublabel,
    value,
    selected,
    type = "radio",
    onSelect,
}: OptionRowProps) => {
    return (
        <button
            type="button"
            onClick={() => onSelect(value)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-card border transition-all duration-200 mb-3 text-left ${selected
                    ? "bg-accent-primary/10 border-accent-primary"
                    : "bg-grey-900 border-grey-900 hover:border-grey-700"
                }`}
        >
            {/* Indicator */}
            {type === "radio" ? (
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "border-accent-primary" : "border-grey-700"
                        }`}
                >
                    {selected && <div className="w-2.5 h-2.5 rounded-full bg-accent-primary" />}
                </div>
            ) : (
                <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "border-accent-primary bg-accent-primary" : "border-grey-700"
                        }`}
                >
                    {selected && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                            <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            )}

            <div>
                <p className={`text-body-lg font-medium transition-colors ${selected ? "text-base-white" : "text-grey-300"}`}>
                    {label}
                </p>
                {sublabel && (
                    <p className="text-body-sm text-grey-500 mt-0.5">{sublabel}</p>
                )}
            </div>
        </button>
    );
};
