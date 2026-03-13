import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { updateDraft } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { Scroller } from "../../../../components/ui/Scroller";
import { UnitToggle } from "../../../../components/ui/UnitToggle";
import { KG_VALUES, LBS_VALUES } from "../../onboarding.constants";

export const Step5Weight = () => {
  const dispatch = useDispatch();
  const saved = useSelector((s: RootState) => s.onboarding.draft.weight);
  const [unit, setUnit] = useState<"kg" | "lbs">(
    (saved?.unit as "kg" | "lbs") ?? "kg",
  );
  const [kgValue, setKgValue] = useState<number>(
    saved?.unit === "kg" ? (saved.value as number) : 70,
  );
  const [lbsValue, setLbsValue] = useState<number>(
    saved?.unit === "lbs" ? (saved.value as number) : 154,
  );

  return (
    <StepShell
      stepNumber={5}
      title="What's your weight?"
      subtitle="This helps us track your progress and set realistic goals."
      skippable
      onContinue={() => {
        const value = unit === "kg" ? kgValue : lbsValue;
        dispatch(updateDraft({ weight: { value, unit } }));
      }}
    >
      <UnitToggle options={["kg", "lbs"]} value={unit} onChange={setUnit} />

      {unit === "kg" ? (
        <Scroller
          items={KG_VALUES}
          value={kgValue}
          onChange={(v) => setKgValue(Number(v))}
          suffix="kg"
        />
      ) : (
        <Scroller
          items={LBS_VALUES}
          value={lbsValue}
          onChange={(v) => setLbsValue(Number(v))}
          suffix="lbs"
        />
      )}
    </StepShell>
  );
};
