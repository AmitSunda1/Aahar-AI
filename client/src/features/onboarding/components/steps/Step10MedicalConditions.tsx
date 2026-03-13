import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../../app/store";
import { resetOnboarding } from "../../onboardingSlice";
import { StepShell } from "../StepShell";
import { OptionRow } from "../../../../components/ui/OptionRow";
import { Button } from "../../../../components/ui/Button";
import { TextInput } from "../../../../components/ui/TextInput";
import { useSaveOnboardingMutation } from "../../onboardingApi";
import { MEDICAL_CONDITION_PRESETS } from "../../onboarding.constants";
import { useNavigate } from "react-router-dom";

export const Step10MedicalConditions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const draft = useSelector((s: RootState) => s.onboarding.draft);
  const savedConditions = draft.medicalConditions ?? [];

  const [selected, setSelected] = useState<string[]>(savedConditions);
  const [customInput, setCustomInput] = useState("");
  const [customList, setCustomList] = useState<string[]>(
    savedConditions.filter(
      (c) => !MEDICAL_CONDITION_PRESETS.map((p) => p.value).includes(c),
    ),
  );

  const [saveOnboarding, { isLoading }] = useSaveOnboardingMutation();

  const handleToggle = (value: string) => {
    if (value === "none") {
      setSelected(selected.includes("none") ? [] : ["none"]);
      return;
    }
    setSelected((prev) => {
      const withoutNone = prev.filter((x) => x !== "none");
      return withoutNone.includes(value)
        ? withoutNone.filter((x) => x !== value)
        : [...withoutNone, value];
    });
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || customList.includes(trimmed)) return;
    const updated = [...customList, trimmed];
    setCustomList(updated);
    setSelected((prev) => [...prev.filter((x) => x !== "none"), trimmed]);
    setCustomInput("");
  };

  const handleFinish = async () => {
    const allConditions = [
      ...selected,
      ...customList.filter((c) => !selected.includes(c)),
    ];
    const finalConditions = allConditions.filter((c) => c !== "none");

    const finalDraft = {
      ...draft,
      medicalConditions: finalConditions,
      name: draft.name || "",
      gender: draft.gender || "other",
      age: Number(draft.age) || 25,
      height: {
        value: Number(draft.height?.value) || 170,
        unit: draft.height?.unit || "cm",
      },
      weight: {
        value: Number(draft.weight?.value) || 70,
        unit: draft.weight?.unit || "kg",
      },
      goal: draft.goal || "maintain_weight",
      activityLevel: draft.activityLevel || "moderate",
      dailySteps: Number(draft.dailySteps) || 5000,
      dietaryPreferences: (draft.dietaryPreferences?.length
        ? draft.dietaryPreferences
        : ["vegetarian"]) as any,
    };

    try {
      // onboardingApi's onQueryStarted will update the getMe cache automatically
      await saveOnboarding(finalDraft).unwrap();
      navigate("/dashboard", { replace: true });
      setTimeout(() => dispatch(resetOnboarding()), 300);
    } catch (err) {
      console.error("Onboarding save failed:", err);
    }
  };

  return (
    <StepShell
      stepNumber={10}
      title="Any medical conditions?"
      subtitle="We'll provide personalized suggestions based on your health. Select all that apply."
      onSkip={handleFinish}
      footer={
        <Button onClick={handleFinish} loading={isLoading} fullWidth>
          Finish
        </Button>
      }
    >
      {MEDICAL_CONDITION_PRESETS.map((opt) => (
        <OptionRow
          key={opt.value}
          label={opt.label}
          value={opt.value}
          type="checkbox"
          selected={selected.includes(opt.value)}
          onSelect={handleToggle}
        />
      ))}

      {customList.map((c) => (
        <OptionRow
          key={c}
          label={c}
          value={c}
          type="checkbox"
          selected={selected.includes(c)}
          onSelect={handleToggle}
        />
      ))}

      <p className="text-body-sm text-grey-500 mt-2 mb-2">
        Add a custom medical condition
      </p>
      <div className="flex gap-2 mb-6">
        <TextInput
          type="text"
          placeholder="Enter condition"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
          className="h-12 flex-1 text-body"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="px-4 h-12 rounded-card text-body font-semibold text-grey-300 bg-grey-900 hover:bg-grey-700 disabled:opacity-40 transition-all"
        >
          Add
        </button>
      </div>
    </StepShell>
  );
};
