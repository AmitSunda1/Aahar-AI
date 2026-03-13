import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { Scroller } from "../../../../components/ui/Scroller";
import { AGES } from "../../onboarding.constants";

export const Step3Age = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.age ?? 25);
  const [age, setAge] = useState<number>(saved);

  return (
    <StepShell
      stepNumber={3}
      title="How old are you?"
      subtitle="Age helps us tailor your nutrition and fitness goals."
      skippable
      onContinue={() => dispatch(updateDraft({ age }))}
    >
      <Scroller
        items={AGES}
        value={age}
        onChange={(v) => setAge(Number(v))}
        suffix="years"
      />
    </StepShell>
  );
};
