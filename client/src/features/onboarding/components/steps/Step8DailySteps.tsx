import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { TextInput } from "../../../../components/ui/TextInput";
import { DAILY_STEPS_PRESETS } from "../../onboarding.constants";

export const Step8DailySteps = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.dailySteps);
  const [selected, setSelected] = useState<number | null>(saved ?? null);
  const [customInput, setCustomInput] = useState(
    saved && !DAILY_STEPS_PRESETS.includes(saved) ? String(saved) : "",
  );

  const effectiveValue = customInput !== "" ? Number(customInput) : selected;
  const canContinue = effectiveValue !== null && effectiveValue > 0;

  const handlePreset = (val: number) => {
    setSelected(val);
    setCustomInput("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setCustomInput(val);
    setSelected(null);
  };

  return (
    <StepShell
      stepNumber={8}
      title="Average daily steps?"
      subtitle="This helps us understand your daily movement pattern."
      skippable
      onContinue={() => {
        if (canContinue && effectiveValue !== null)
          dispatch(updateDraft({ dailySteps: effectiveValue }));
      }}
      continueDisabled={!canContinue}
    >
      <div className="grid grid-cols-2 gap-3 mb-6">
        {DAILY_STEPS_PRESETS.map((preset) => {
          const isActive = selected === preset && customInput === "";
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className={`h-16 rounded-card text-body-lg font-semibold transition-all ${
                isActive
                  ? "bg-accent-primary/10 border border-accent-primary text-base-white"
                  : "bg-grey-900 border border-grey-900 text-grey-300 hover:border-grey-700"
              }`}
            >
              {preset.toLocaleString()}
            </button>
          );
        })}
      </div>

      <p className="text-body-sm text-grey-500 mb-2">Or enter a custom value</p>
      <TextInput
        type="text"
        inputMode="numeric"
        placeholder="Enter steps"
        value={customInput}
        onChange={handleCustomChange}
        className="mb-6"
      />

      <p className="text-body-sm text-grey-500">
        The average person walks 5,000–7,000 steps per day. Active individuals
        often reach 10,000+ steps.
      </p>
    </StepShell>
  );
};
