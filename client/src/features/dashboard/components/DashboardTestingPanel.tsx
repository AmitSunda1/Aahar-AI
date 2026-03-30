import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import type { UpdateTodayProgressRequest } from "../dashboard.types";

interface DashboardTestingPanelProps {
  onSubmit: (payload: UpdateTodayProgressRequest) => Promise<void>;
  isSubmitting: boolean;
}

const toOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const DashboardTestingPanel = ({
  onSubmit,
  isSubmitting,
}: DashboardTestingPanelProps) => {
  const [form, setForm] = useState({
    caloriesConsumed: "",
    carbsConsumed: "",
    proteinConsumed: "",
    fatConsumed: "",
    stepsCompleted: "",
    exerciseMinutesCompleted: "",
    caloriesBurned: "",
    weightKg: "",
    notes: "",
  });

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: UpdateTodayProgressRequest = {
      caloriesConsumed: toOptionalNumber(form.caloriesConsumed),
      carbsConsumed: toOptionalNumber(form.carbsConsumed),
      proteinConsumed: toOptionalNumber(form.proteinConsumed),
      fatConsumed: toOptionalNumber(form.fatConsumed),
      stepsCompleted: toOptionalNumber(form.stepsCompleted),
      exerciseMinutesCompleted: toOptionalNumber(form.exerciseMinutesCompleted),
      caloriesBurned: toOptionalNumber(form.caloriesBurned),
      weightKg: toOptionalNumber(form.weightKg),
      notes: form.notes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    Object.keys(payload).forEach((key) => {
      const typedKey = key as keyof UpdateTodayProgressRequest;
      if (
        payload[typedKey] === undefined ||
        (Array.isArray(payload[typedKey]) && payload[typedKey]?.length === 0)
      ) {
        delete payload[typedKey];
      }
    });

    await onSubmit(payload);
  };

  return (
    <section className="mt-7 rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-h2">Manual Testing</h2>
          <p className="mt-1 text-body text-grey-500">
            Update today&apos;s progress from the UI and verify dashboard
            numbers end to end.
          </p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            type="number"
            min="0"
            value={form.caloriesConsumed}
            onChange={(event) =>
              setField("caloriesConsumed", event.target.value)
            }
            placeholder="Calories consumed"
          />
          <TextInput
            type="number"
            min="0"
            value={form.caloriesBurned}
            onChange={(event) => setField("caloriesBurned", event.target.value)}
            placeholder="Calories burned"
          />
          <TextInput
            type="number"
            min="0"
            value={form.carbsConsumed}
            onChange={(event) => setField("carbsConsumed", event.target.value)}
            placeholder="Carbs g"
          />
          <TextInput
            type="number"
            min="0"
            value={form.proteinConsumed}
            onChange={(event) =>
              setField("proteinConsumed", event.target.value)
            }
            placeholder="Protein g"
          />
          <TextInput
            type="number"
            min="0"
            value={form.fatConsumed}
            onChange={(event) => setField("fatConsumed", event.target.value)}
            placeholder="Fat g"
          />
          <TextInput
            type="number"
            min="0"
            value={form.stepsCompleted}
            onChange={(event) => setField("stepsCompleted", event.target.value)}
            placeholder="Steps"
          />
          <TextInput
            type="number"
            min="0"
            value={form.exerciseMinutesCompleted}
            onChange={(event) =>
              setField("exerciseMinutesCompleted", event.target.value)
            }
            placeholder="Exercise minutes"
          />
          <TextInput
            type="number"
            min="0"
            step="0.1"
            value={form.weightKg}
            onChange={(event) => setField("weightKg", event.target.value)}
            placeholder="Weight kg"
          />
        </div>

        <TextInput
          type="text"
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Optional notes, comma separated"
        />

        <Button type="submit" fullWidth loading={isSubmitting}>
          Update today&apos;s progress
        </Button>
      </form>
    </section>
  );
};
