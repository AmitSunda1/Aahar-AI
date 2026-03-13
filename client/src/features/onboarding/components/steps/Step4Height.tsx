import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { Scroller } from "../../../../components/ui/Scroller";
import { UnitToggle } from "../../../../components/ui/UnitToggle";
import { CM_VALUES, FT_VALUES } from "../../onboarding.constants";

export const Step4Height = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.height);
  const [unit, setUnit] = useState<"cm" | "ft">(
    (saved?.unit as "cm" | "ft") ?? "cm",
  );
  const [cmValue, setCmValue] = useState<number>(
    saved?.unit === "cm" ? Number(saved.value) : 170,
  );
  const [ftValue, setFtValue] = useState<string>(
    saved?.unit === "ft" ? String(saved.value) : "5'7\"",
  );

  return (
    <StepShell
      stepNumber={4}
      title="What's your height?"
      subtitle="This helps us calculate your BMI and nutritional requirements."
      skippable
      onContinue={() => {
        const value = unit === "cm" ? cmValue : ftValue;
        dispatch(updateDraft({ height: { value: value as number, unit } }));
      }}
    >
      <UnitToggle options={["cm", "ft"]} value={unit} onChange={setUnit} />

      {unit === "cm" ? (
        <Scroller
          items={CM_VALUES}
          value={cmValue}
          onChange={(v) => setCmValue(Number(v))}
          suffix="cm"
        />
      ) : (
        <Scroller
          items={FT_VALUES}
          value={ftValue}
          onChange={(v) => setFtValue(String(v))}
        />
      )}
    </StepShell>
  );
};
