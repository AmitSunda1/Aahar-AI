import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import type { ActivityLevel } from "../../onboarding.types";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { OptionRow } from "../../../../components/ui/OptionRow";
import { ACTIVITY_LEVEL_OPTIONS } from "../../onboarding.constants";

export const Step7ActivityLevel = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.activityLevel);
  const [activity, setActivity] = useState<ActivityLevel | undefined>(saved);

  return (
    <StepShell
      stepNumber={7}
      title="How active are you?"
      subtitle="This helps us calculate your daily calorie burn."
      skippable
      onContinue={() => {
        if (activity) dispatch(updateDraft({ activityLevel: activity }));
      }}
      continueDisabled={!activity}
    >
      {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
        <OptionRow
          key={opt.value}
          label={opt.label}
          sublabel={opt.sublabel}
          value={opt.value}
          selected={activity === opt.value}
          onSelect={(v) => setActivity(v as ActivityLevel)}
        />
      ))}
    </StepShell>
  );
};
