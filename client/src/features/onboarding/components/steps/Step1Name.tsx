import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { TextInput } from "../../../../components/ui/TextInput";

export const Step1Name = () => {
  const dispatch = useDispatch();
  const savedName = useSelector(
    (s: RootState) => s.onboarding.draft.name ?? "",
  );
  const [name, setName] = useState(savedName);

  return (
    <StepShell
      stepNumber={1}
      title="What should we call you?"
      subtitle="This helps us personalize your experience."
      onContinue={() => dispatch(updateDraft({ name: name.trim() }))}
      continueDisabled={name.trim().length === 0}
    >
      <TextInput
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        autoFocus
      />
    </StepShell>
  );
};
