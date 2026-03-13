interface UnitToggleProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (unit: T) => void;
}

/**
 * Pill-style toggle for switching between two measurement units (e.g. cm / ft, kg / lbs).
 * Generic so callers stay type-safe without any casting.
 */
export function UnitToggle<T extends string>({
  options,
  value,
  onChange,
}: UnitToggleProps<T>) {
  return (
    <div className="flex gap-3 mb-6">
      {options.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`flex-1 h-12 rounded-card text-body-lg font-semibold transition-all ${
            value === u
              ? "bg-grey-700 text-base-white"
              : "bg-grey-900 text-grey-500 hover:bg-grey-900/80"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
