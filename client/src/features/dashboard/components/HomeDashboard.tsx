import { useEffect, useMemo, useRef, useState } from "react";
// import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Loader } from "../../../components/ui/Loader";
import { useGetMeQuery } from "../../auth/authApi";
import {
  useGetHomeDashboardQuery,
  useUpdateTodayProgressMutation,
} from "../dashboardApi";
// import { DashboardTestingPanel } from "./DashboardTestingPanel";
import type {
  // DashboardInsight,
  // UpdateTodayProgressRequest,
  WeightPoint,
} from "../dashboard.types";

const FILL_COLOR = "#0B5FFF";

const RevealSection = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0px)" : "translateY(16px)",
        transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
      }}
    >
      {children}
    </section>
  );
};

const MacroRing = ({
  value,
  target,
  label,
}: {
  value: number;
  target: number;
  label: string;
}) => {
  const rawProgress = target > 0 ? (value / target) * 100 : 0;
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const size = 96;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;
  const progressStroke = FILL_COLOR;

  useEffect(() => {
    setAnimatedProgress(0);
    const frame = window.requestAnimationFrame(() => {
      setAnimatedProgress(progress);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(209, 209, 214, 0.2)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressStroke}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1200ms ease" }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-base-white text-[18px] font-semibold"
        >
          {value}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-grey-500 text-[10px]"
        >
          /{target}g
        </text>
      </svg>
      <p className="text-body text-grey-300">{label}</p>
      <p className="text-caption text-grey-500">
        {Math.round(rawProgress)}% of goal
      </p>
    </div>
  );
};

const WeightChart = ({
  points,
  onLogWeight,
}: {
  points: WeightPoint[];
  onLogWeight: (weightKg: number) => Promise<void>;
}) => {
  const validPoints = points.filter((point) => Number.isFinite(point.value));
  if (validPoints.length === 0) return null;
  const [isWeightLogOpen, setIsWeightLogOpen] = useState(false);
  const [weightToLog, setWeightToLog] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  const formatAxisDate = (rawLabel: string, index: number, total: number) => {
    const parsed = new Date(rawLabel);

    if (Number.isFinite(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      });
    }

    // Fallback when backend labels are not date strings.
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - (total - 1 - index));
    return fallback.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
    });
  };

  const chartStartX = 16;
  const chartEndX = 108;
  const chartWidth = chartEndX - chartStartX;
  const chartTopY = 4;
  const chartHeight = 38;

  const minValue = Math.min(...validPoints.map((p) => p.value));
  const maxValue = Math.max(...validPoints.map((p) => p.value));
  const hasHistory = validPoints.length > 1 && maxValue !== minValue;

  const baselineValue = validPoints[validPoints.length - 1].value;
  const min = hasHistory ? minValue : baselineValue - 0.5;
  const max = hasHistory ? maxValue : baselineValue + 0.5;
  const range = Math.max(0.1, max - min);

  const yTicks = [max, min + range / 2, min].map((value) =>
    Number(value.toFixed(1)),
  );

  const plotted = validPoints.map((p, idx) => {
    const x =
      validPoints.length === 1
        ? chartStartX
        : chartStartX + (idx / (validPoints.length - 1)) * chartWidth;
    const normalized = (p.value - min) / range;
    const y = chartTopY + chartHeight - normalized * chartHeight;
    return { x, y, ...p };
  });

  const pathD =
    plotted.length === 1
      ? `M${chartStartX.toFixed(2)},${plotted[0].y.toFixed(2)} L${chartEndX.toFixed(2)},${plotted[0].y.toFixed(2)}`
      : plotted
          .map(
            (pt, idx) =>
              `${idx === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`,
          )
          .join(" ");

  const handleSaveWeight = async () => {
    setWeightError(null);

    const parsedWeight = Number(weightToLog);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setWeightError("Enter a valid weight in kg.");
      return;
    }

    const normalizedWeight = Number(parsedWeight.toFixed(1));

    setIsSavingWeight(true);
    try {
      await onLogWeight(normalizedWeight);
      setWeightToLog("");
      setIsWeightLogOpen(false);
    } catch {
      setWeightError("Failed to log weight.");
    } finally {
      setIsSavingWeight(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/40 p-4 shadow-card-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-h3">Weight</h3>
        <button
          type="button"
          onClick={() => {
            setWeightError(null);
            setIsWeightLogOpen((prev) => !prev);
          }}
          className="h-10 w-10 rounded-full bg-accent-primary text-[28px] leading-none text-base-white"
        >
          +
        </button>
      </div>

      <div className="mb-3 inline-flex rounded-full border border-accent-primary/40 bg-accent-primary/15 px-4 py-1 text-label-lg text-accent-primary">
        Last 7 days
      </div>

      {isWeightLogOpen && (
        <div className="mb-4 space-y-2">
          <input
            type="number"
            min="1"
            step="0.1"
            value={weightToLog}
            onChange={(event) => setWeightToLog(event.target.value)}
            placeholder="Enter weight (kg)"
            className="h-11 w-full rounded-[12px] border border-grey-700/50 bg-grey-900/60 px-3 text-body text-base-white placeholder-grey-500 outline-none focus:border-accent-primary"
          />
          {weightError && (
            <p className="text-caption text-semantic-error">{weightError}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsWeightLogOpen(false);
                setWeightToLog("");
                setWeightError(null);
              }}
              className="h-10 rounded-full border border-grey-700/60 text-body text-grey-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveWeight}
              disabled={isSavingWeight}
              className="h-10 rounded-full bg-accent-primary text-body font-semibold text-base-white disabled:bg-grey-700/50 disabled:text-grey-500"
            >
              {isSavingWeight ? "Saving..." : "Log"}
            </button>
          </div>
        </div>
      )}

      <svg viewBox="0 0 112 44" className="h-36 w-full">
        <text
          x="1"
          y="4"
          dominantBaseline="hanging"
          className="fill-grey-500 text-[3px]"
        >
          {yTicks[0].toFixed(1)}
        </text>
        <text
          x="1"
          y="22"
          dominantBaseline="middle"
          className="fill-grey-500 text-[3px]"
        >
          {yTicks[1].toFixed(1)}
        </text>
        <text
          x="1"
          y="42"
          dominantBaseline="ideographic"
          className="fill-grey-500 text-[3px]"
        >
          {yTicks[2].toFixed(1)}
        </text>

        <line
          x1={chartStartX}
          y1="12"
          x2={chartEndX}
          y2="12"
          stroke="rgba(209,209,214,0.35)"
          strokeWidth="0.4"
        />
        <line
          x1={chartStartX}
          y1="22"
          x2={chartEndX}
          y2="22"
          stroke="rgba(209,209,214,0.35)"
          strokeWidth="0.4"
        />
        <line
          x1={chartStartX}
          y1="32"
          x2={chartEndX}
          y2="32"
          stroke="rgba(209,209,214,0.35)"
          strokeWidth="0.4"
        />

        <path d={pathD} stroke="#0B5FFF" strokeWidth="0.9" fill="none" />
        {plotted.map((pt, idx) => (
          <circle
            key={`${pt.label}-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={idx === plotted.length - 1 ? 1.5 : 1.1}
            fill="#0B5FFF"
            stroke="#D1D1D6"
            strokeWidth="0.35"
          />
        ))}

        {plotted.length === 1 && (
          <circle
            cx={chartEndX}
            cy={plotted[0].y}
            r={1.5}
            fill="#0B5FFF"
            stroke="#D1D1D6"
            strokeWidth="0.35"
          />
        )}
      </svg>

      <div className="mb-4 mt-1 flex items-center justify-between text-body text-grey-500">
        {validPoints.map((point, idx) => (
          <span
            key={`${point.label}-${idx}`}
            className={
              idx === validPoints.length - 1 ? "text-accent-primary" : ""
            }
          >
            {formatAxisDate(point.label, idx, validPoints.length)}
          </span>
        ))}
      </div>

      <div className="border-t border-grey-700/50 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-body-lg text-grey-500">Current</p>
          <p className="text-h2">
            {validPoints[validPoints.length - 1].value.toFixed(1)} kg
          </p>
        </div>
      </div>
    </div>
  );
};

// const InsightCard = ({ insight }: { insight: DashboardInsight }) => {
//   const toneClass =
//     insight.tone === "positive"
//       ? "bg-accent-primary/15 text-accent-primary"
//       : insight.tone === "warning"
//         ? "bg-semantic-warning/20 text-semantic-warning"
//         : "bg-grey-700/30 text-grey-300";

//   return (
//     <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
//       <div className="flex items-start gap-3">
//         <div
//           className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}
//         >
//           <span className="text-body-lg">↗</span>
//         </div>
//         <div>
//           <h4 className="text-h3">{insight.title}</h4>
//           <p className="mt-1 text-body text-grey-500">{insight.subtitle}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

const RecommendationList = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => {
  return (
    <div className="rounded-[20px] border border-grey-700/50 bg-grey-900/40 p-4">
      <h3 className="text-h3">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="text-body text-grey-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
};

export const HomeDashboard = () => {
  const navigate = useNavigate();
  const { data: meData } = useGetMeQuery();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetHomeDashboardQuery();
  const [updateTodayProgress, { isLoading: isUpdatingProgress }] =
    useUpdateTodayProgressMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStepLogOpen, setIsStepLogOpen] = useState(false);
  const [stepsToLog, setStepsToLog] = useState("");
  const [animatedKcalProgress, setAnimatedKcalProgress] = useState(0);

  const lastGeneratedLabel = useMemo(() => {
    if (!data?.meta?.lastPlanGeneratedAt) return "Not generated yet";
    return new Date(data.meta.lastPlanGeneratedAt).toLocaleString();
  }, [data?.meta?.lastPlanGeneratedAt]);

  const kcalProgress = useMemo(() => {
    const d = data?.data;
    if (!d) return 0;

    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          ((d.caloriesEaten - d.caloriesBurned) / Math.max(1, d.calorieGoal)) *
            100,
        ),
      ),
    );
  }, [data?.data]);

  useEffect(() => {
    setAnimatedKcalProgress(0);
    const frame = window.requestAnimationFrame(() => {
      setAnimatedKcalProgress(kcalProgress);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [kcalProgress]);

  // const handleProgressUpdate = async (payload: UpdateTodayProgressRequest) => {
  //   setActionError(null);

  //   try {
  //     await updateTodayProgress(payload).unwrap();
  //     await refetch();
  //   } catch (error) {
  //     const message =
  //       (error as { data?: { message?: string } })?.data?.message ||
  //       "Failed to update today's progress";
  //     setActionError(message);
  //   }
  // };

  const caloriesFromSteps = (steps: number) =>
    Math.max(1, Math.round(steps * 0.04));

  const handleLogSteps = async () => {
    setActionError(null);

    const parsedSteps = Number(stepsToLog);
    if (!Number.isFinite(parsedSteps) || parsedSteps <= 0) {
      setActionError("Enter a valid number of steps to log.");
      return;
    }

    const normalizedSteps = Math.round(parsedSteps);

    try {
      await updateTodayProgress({
        stepsCompleted: normalizedSteps,
        caloriesBurned: caloriesFromSteps(normalizedSteps),
        notes: [`Manual steps log: ${normalizedSteps}`],
      }).unwrap();

      setStepsToLog("");
      setIsStepLogOpen(false);
      await refetch();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to log steps.";
      setActionError(message);
    }
  };

  const handleLogWeight = async (weightKg: number) => {
    setActionError(null);

    try {
      await updateTodayProgress({
        weightKg,
        notes: [`Manual weight log: ${weightKg} kg`],
      }).unwrap();

      await refetch();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to log weight.";
      setActionError(message);
      throw error;
    }
  };

  if ((isLoading || isFetching) && !data) return <Loader />;

  if (isError || !data?.data) {
    return (
      <div className="px-4 pt-6 text-base-white">
        <div className="rounded-[20px] border border-semantic-error/40 bg-semantic-error/10 p-4">
          <h2 className="text-h3">Unable to load dashboard</h2>
          <p className="mt-2 text-body text-grey-300">
            Please refresh and try again.
          </p>
        </div>
      </div>
    );
  }

  const d = data.data;
  const meta = data.meta;
  const kcalRingSize = 136;
  const kcalRingStroke = 10;
  const kcalRingRadius = (kcalRingSize - kcalRingStroke) / 2;
  const kcalRingCircumference = 2 * Math.PI * kcalRingRadius;
  const kcalRingOffset =
    kcalRingCircumference -
    (animatedKcalProgress / 100) * kcalRingCircumference;
  const todayIsoDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayPlan =
    d.weeklyMealPlan?.days.find((day) => day.dayNumber === todayIsoDay) ??
    d.weeklyMealPlan?.days[0];
  const user = meData?.data?.user;
  const hour = new Date().getHours();
  const greetingPrefix =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const userName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    d.greetingTitle ||
    "there";
  // const planSourceLabel =
  //   meta.mealPlanSource === "gemini"
  //     ? "Gemini suggestion"
  //     : meta.mealPlanSource === "fallback"
  //       ? "Fallback data"
  //       : "Not generated";
  // const planSourceClass =
  //   meta.mealPlanSource === "gemini"
  //     ? "border-accent-primary/40 bg-accent-primary/15 text-accent-primary"
  //     : meta.mealPlanSource === "fallback"
  //       ? "border-semantic-warning/40 bg-semantic-warning/10 text-semantic-warning"
  //       : "border-grey-700/50 bg-grey-900/50 text-grey-300";

  return (
    <div className="bg-base-black px-4 pb-8 pt-4 text-base-white">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1">{`${greetingPrefix}, ${userName}`}</h1>
          <p className="mt-1 text-body text-grey-500">
            {meta.hasActivePlan
              ? "Saved dashboard targets"
              : "Starter dashboard targets"}{" "}
            • {d.todayStatus.replace(/_/g, " ")}
          </p>
        </div>
        {/* <div
          className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-label-sm ${planSourceClass}`}
        >
          {planSourceLabel}
        </div> */}
      </div>

      {!meta.canUseGemini && (
        <div className="mb-4 rounded-[18px] border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-body text-grey-300">
          Our model is not configured on the server. Daily targets are still
          based on onboarding data and goal.
        </div>
      )}

      {meta.aiSuggestionsStatus &&
        meta.aiSuggestionsStatus !== "ok" &&
        meta.aiSuggestionsStatus !== "not_due" &&
        meta.aiSuggestionsStatus !== "gemini_not_configured" && (
          <div className="mb-4 rounded-[18px] border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-body text-grey-300">
            <p className="font-medium text-base-white">
              Weekly AI suggestions are using fallback data.
            </p>
            <p className="mt-1">
              {meta.aiSuggestionsStatus === "gemini_quota_exceeded"
                ? "Our model returned a quota or rate-limit error."
                : meta.aiSuggestionsStatus === "gemini_invalid_response"
                  ? "Our model returned a response that did not match the required plan format."
                  : "Our model returned a generation error."}
            </p>
            {meta.aiError && (
              <p className="mt-2 break-words text-sm text-grey-400">
                {meta.aiError}
              </p>
            )}
          </div>
        )}

      {actionError && (
        <div className="mb-4 rounded-[18px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-grey-300">
          {actionError}
        </div>
      )}

      <RevealSection className="rounded-[26px] border border-grey-700/50 bg-[radial-gradient(circle_at_top_left,rgba(11,95,255,0.22),rgba(9,9,13,0.2)_38%,rgba(9,9,13,0.9)_100%)] p-5 shadow-card-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-label-lg uppercase text-grey-300">Eaten</p>
            <p className="text-[34px] leading-[36px] font-semibold">
              {d.caloriesEaten}
            </p>
            <p className="text-body text-grey-500">kcal</p>
          </div>

          <div className="relative flex h-[136px] w-[136px] items-center justify-center">
            <svg
              width={kcalRingSize}
              height={kcalRingSize}
              viewBox={`0 0 ${kcalRingSize} ${kcalRingSize}`}
              className="absolute inset-0"
            >
              <circle
                cx={kcalRingSize / 2}
                cy={kcalRingSize / 2}
                r={kcalRingRadius}
                stroke="rgba(209, 209, 214, 0.24)"
                strokeWidth={kcalRingStroke}
                fill="none"
              />
              <circle
                cx={kcalRingSize / 2}
                cy={kcalRingSize / 2}
                r={kcalRingRadius}
                stroke={FILL_COLOR}
                strokeWidth={kcalRingStroke}
                fill="none"
                strokeDasharray={kcalRingCircumference}
                strokeDashoffset={kcalRingOffset}
                style={{ transition: "stroke-dashoffset 1400ms ease" }}
                strokeLinecap="round"
                transform={`rotate(-90 ${kcalRingSize / 2} ${kcalRingSize / 2})`}
              />
            </svg>
            <div className="text-center">
              <p className="text-[36px] leading-[36px] font-semibold">
                {d.caloriesLeft}
              </p>
              <p className="mt-1 text-label-lg uppercase text-grey-300">
                kcal left
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-label-lg uppercase text-grey-300">Burned</p>
            <p className="text-[34px] leading-[36px] font-semibold">
              {d.caloriesBurned}
            </p>
            <p className="text-body text-grey-500">kcal</p>
          </div>
        </div>

        {/* <div className="my-6 border-t border-grey-700/70" />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-label-lg uppercase text-grey-300">Carbs</p>
            <p className="text-[26px] leading-[28px] font-semibold">
              {d.macros.carbsConsumed}
              <span className="text-body text-grey-300">
                /{d.macros.carbs}g
              </span>
            </p>
          </div>
          <div>
            <p className="text-label-lg uppercase text-grey-300">Protein</p>
            <p className="text-[26px] leading-[28px] font-semibold">
              {d.macros.proteinConsumed}
              <span className="text-body text-grey-300">
                /{d.macros.protein}g
              </span>
            </p>
          </div>
          <div>
            <p className="text-label-lg uppercase text-grey-300">Fat</p>
            <p className="text-[26px] leading-[28px] font-semibold">
              {d.macros.fatConsumed}
              <span className="text-body text-grey-300">/{d.macros.fat}g</span>
            </p>
          </div>
        </div> */}
      </RevealSection>

      <RevealSection className="mt-6" delay={60}>
        <h2 className="text-h2">Macros</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MacroRing
            value={d.macros.carbsConsumed}
            target={d.macros.carbs}
            label="Carbohydrates"
          />
          <MacroRing
            value={d.macros.fatConsumed}
            target={d.macros.fat}
            label="Fat"
          />
          <MacroRing
            value={d.macros.proteinConsumed}
            target={d.macros.protein}
            label="Protein"
          />
        </div>
      </RevealSection>

      <RevealSection
        className="mt-7 grid grid-cols-2 items-stretch gap-3"
        delay={120}
      >
        <div className="flex min-h-[250px] flex-col rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
          <p className="text-h3">Steps</p>
          <p className="mt-2 text-[30px] leading-[32px] font-semibold">
            {d.stepCount}
          </p>
          <p className="text-caption text-grey-500">
            Goal: {d.stepGoal.toLocaleString()} steps
          </p>
          <div className="mt-5 h-2 rounded-full bg-grey-700/45">
            <div
              className="h-full rounded-full bg-accent-primary"
              style={{
                width: `${Math.min(100, (d.stepCount / Math.max(1, d.stepGoal)) * 100)}%`,
                backgroundColor: FILL_COLOR,
                transition: "width 700ms ease",
              }}
            />
          </div>

          <div className="mt-auto pt-2">
            {isStepLogOpen ? (
              <div className="space-y-3">
                <input
                  type="number"
                  min="1"
                  value={stepsToLog}
                  onChange={(event) => setStepsToLog(event.target.value)}
                  placeholder="Enter steps"
                  className="h-11 w-full rounded-[12px] border border-grey-700/50 bg-grey-900/60 px-3 text-body text-base-white placeholder-grey-500 outline-none focus:border-accent-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStepLogOpen(false);
                      setStepsToLog("");
                    }}
                    className="h-10 rounded-full border border-grey-700/60 text-body text-grey-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLogSteps}
                    disabled={isUpdatingProgress}
                    className="h-10 rounded-full bg-accent-primary text-body font-semibold text-base-white disabled:bg-grey-700/50 disabled:text-grey-500"
                  >
                    {isUpdatingProgress ? "Saving..." : "Log"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsStepLogOpen(true)}
                className="h-11 w-full rounded-full border border-accent-primary/60 bg-accent-primary/10 text-body font-semibold text-accent-primary transition-colors hover:bg-accent-primary/15"
              >
                Log steps
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-[250px] flex-col rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
          <p className="text-h3">Exercise</p>
          <p className="mt-2 text-[30px] leading-[32px] font-semibold">
            {d.exerciseCalories} kcal
          </p>
          <p className="text-caption text-grey-500">
            {String(Math.floor(d.exerciseDurationMinutes / 60)).padStart(
              2,
              "0",
            )}
            :{String(d.exerciseDurationMinutes % 60).padStart(2, "0")} hr
          </p>

          <button
            type="button"
            onClick={() => navigate("/workout")}
            className="mt-auto h-11 w-full rounded-full border border-accent-primary/70 text-[34px] leading-none text-accent-primary"
          >
            +
          </button>
        </div>
      </RevealSection>

      <RevealSection className="mt-7" delay={180}>
        <div className="mb-4 rounded-[20px] border border-grey-700/50 bg-grey-900/40 p-4">
          <h2 className="text-h2">Today's Plan</h2>
          <p className="mt-1 text-body text-grey-500">
            Refreshed every 7 days from your onboarding profile and goal. Last
            refresh: {lastGeneratedLabel}
          </p>

          {todayPlan ? (
            <div className="mt-4 space-y-4 rounded-[12px]">
              <div>
                <p className=" text-h3 uppercase text-grey-400">
                  Day: {todayPlan.dayLabel}
                </p>
                {/* <p className="mt-1 text-h3 text-base-white">
                  {todayPlan.dayLabel}
                </p> */}
              </div>

              {todayPlan.meals.map((meal, mealIdx) => (
                <div key={`${todayPlan.dayNumber}-${mealIdx}`}>
                  <p className="text-label-lg uppercase text-grey-400">
                    {meal.mealType.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-body text-grey-500">
                    {meal.timingNote}
                  </p>
                  <div className="mt-2 space-y-2">
                    {meal.options.slice(0, 2).map((option, optIdx) => (
                      <div
                        key={`${todayPlan.dayNumber}-${mealIdx}-${optIdx}`}
                        className="rounded-[10px] border border-accent-primary/20 bg-accent-primary/5 p-3"
                      >
                        <p className="font-medium text-base-white">
                          {option.name}
                        </p>
                        <p className="mt-2 text-caption text-grey-500">
                          {option.macros.calories} kcal •{" "}
                          {option.macros.protein}g protein •{" "}
                          {option.macros.carbs}g carbs • {option.macros.fat}g
                          fat
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-grey-700/30 pt-3">
                <p className="text-label-sm uppercase text-grey-500">
                  Daily Habit
                </p>
                <p className="mt-1 text-body text-grey-300">
                  {todayPlan.habitNote}
                </p>
              </div>

              <div className="border-t border-grey-700/30 pt-3">
                <p className="text-label-sm uppercase text-grey-500">Workout</p>
                <p className="mt-1 text-body text-grey-300">
                  {todayPlan.workoutNote}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <RecommendationList
                title="Meals (7 days)"
                items={d.recommendations.meals}
              />
              <RecommendationList
                title="Workouts (7 days)"
                items={d.recommendations.workouts}
              />
              <RecommendationList
                title="Habits (7 days)"
                items={d.recommendations.habits}
              />
            </div>
          )}
        </div>

        <WeightChart points={d.weightTrendKg} onLogWeight={handleLogWeight} />
      </RevealSection>

      {/* <section className="mt-7 grid grid-cols-2 gap-3">
        <NavQuickAction to="/log-food/scan" title="Scan Food" active />
        <NavQuickAction to="/profile" title="AI Coach" />
      </section> */}

      {/* <section className="mt-7">
        <h2 className="text-h2">Insights</h2>
        <div className="mt-4 space-y-3">
          {d.insights.map((insight, idx) => (
            <InsightCard insight={insight} key={`${insight.title}-${idx}`} />
          ))}
        </div>
      </section> */}

      {/* <DashboardTestingPanel
        onSubmit={handleProgressUpdate}
        isSubmitting={isUpdatingProgress}
      /> */}

      {/* <p className="mt-6 text-center text-caption text-grey-500">
        Data source: {d.source}
      </p> */}
    </div>
  );
};

// const NavQuickAction = ({
//   to,
//   title,
//   active = false,
// }: {
//   to: string;
//   title: string;
//   active?: boolean;
// }) => {
//   return (
//     <Link
//       to={to}
//       className={`flex h-36 items-center justify-center rounded-[24px] border px-4 text-center text-h2 transition-colors ${
//         active
//           ? "border-accent-primary bg-accent-primary text-base-white shadow-[0_10px_30px_rgba(11,95,255,0.22)]"
//           : "border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 text-base-white"
//       }`}
//     >
//       {title}
//     </Link>
//   );
// };
