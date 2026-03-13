import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import type { Gender } from "../../onboarding.types";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { OptionRow } from "../../../../components/ui/OptionRow";
import { GENDER_OPTIONS } from "../../onboarding.constants";

export const Step2Gender = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.gender);
  const [gender, setGender] = useState<Gender | undefined>(saved);

  return (
    <StepShell
      stepNumber={2}
      title="What's your gender?"
      subtitle="This helps us calculate your calorie needs accurately."
      skippable
      onContinue={() => {
        if (gender) dispatch(updateDraft({ gender }));
      }}
      continueDisabled={!gender}
    >
      {GENDER_OPTIONS.map((opt) => (
        <OptionRow
          key={opt.value}
          label={opt.label}
          value={opt.value}
          selected={gender === opt.value}
          onSelect={(v) => setGender(v as Gender)}
        />
      ))}
    </StepShell>
  );
};
