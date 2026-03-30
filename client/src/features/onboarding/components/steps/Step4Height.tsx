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
        if (unit === "cm") {
          dispatch(updateDraft({ height: { value: cmValue, unit: "cm" } }));
        } else {
          // Parse e.g. "5'7\"" → total inches → cm so a real number is always stored
          const parts = ftValue.match(/^(\d+)'(\d+)/);
          const totalInches = parts
            ? parseInt(parts[1]) * 12 + parseInt(parts[2])
            : 67; // default ~5'7"
          const cm = Math.round(totalInches * 2.54);
          dispatch(updateDraft({ height: { value: cm, unit: "cm" } }));
        }
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
