import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import type { Goal } from "../../onboarding.types";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { OptionRow } from "../../../../components/ui/OptionRow";
import { GOAL_OPTIONS } from "../../onboarding.constants";

export const Step6Goal = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.goal);
  const [goal, setGoal] = useState<Goal | undefined>(saved);

  return (
    <StepShell
      stepNumber={6}
      title="What's your main goal?"
      subtitle="We'll tailor your nutrition plan to help you achieve it."
      skippable
      onContinue={() => {
        if (goal) dispatch(updateDraft({ goal }));
      }}
      continueDisabled={!goal}
    >
      {GOAL_OPTIONS.map((opt) => (
        <OptionRow
          key={opt.value}
          label={opt.label}
          value={opt.value}
          selected={goal === opt.value}
          onSelect={(v) => setGoal(v as Goal)}
        />
      ))}
    </StepShell>
  );
};
