import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import type { DietaryPreference } from "../../onboarding.types";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { OptionRow } from "../../../../components/ui/OptionRow";
import { DIETARY_PREFERENCE_OPTIONS } from "../../onboarding.constants";

export const Step9DietaryPreferences = () => {
  const dispatch = useDispatch();
  const saved = useSelector(
    (s: RootState) => s.onboarding.draft.dietaryPreferences ?? [],
  );
  const [selected, setSelected] = useState<DietaryPreference[]>(saved);

  const handleToggle = (value: string) => {
    const v = value as DietaryPreference;
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  };

  return (
    <StepShell
      stepNumber={9}
      title="Dietary preferences?"
      subtitle="We'll provide personalized meal suggestions based on your preferences. Select all that apply."
      skippable
      onContinue={() => dispatch(updateDraft({ dietaryPreferences: selected }))}
      continueLabel={selected.length === 0 ? "Skip" : "Continue"}
    >
      {DIETARY_PREFERENCE_OPTIONS.map((opt) => (
        <OptionRow
          key={opt.value}
          label={opt.label}
          value={opt.value}
          type="checkbox"
          selected={selected.includes(opt.value)}
          onSelect={handleToggle}
        />
      ))}
    </StepShell>
  );
};
