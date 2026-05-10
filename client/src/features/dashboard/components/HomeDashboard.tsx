import { useEffect, useMemo, useRef, useState } from "react";
// import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../app/ThemeContext";
import { DashboardSkeleton } from "../../../components/ui/skeletons/DashboardSkeleton";
import { useGetMeQuery } from "../../auth/authApi";
import {
  useGetHomeDashboardQuery,
  useUpdateTodayProgressMutation,
} from "../dashboardApi";
// import { DashboardTestingPanel } from "./DashboardTestingPanel";
import type {
  // DashboardInsight,
  // UpdateTodayProgressRequest,
  DayMeal,
  MealOption,
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

const formatMealType = (mealType: DayMeal["mealType"]) =>
  mealType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getMealAccent = (mealType: DayMeal["mealType"]) => {
  switch (mealType) {
    case "breakfast":
      return {
        chip: "border-[#f6b34d]/30 bg-[#f6b34d]/12 text-[#ffd38c]",
        card:
          "border-[#f6b34d]/20 bg-[linear-gradient(180deg,rgba(246,179,77,0.11),rgba(28,28,30,0.88))]",
      };
    case "lunch":
      return {
        chip: "border-[#57c785]/30 bg-[#57c785]/12 text-[#95f0b6]",
        card:
          "border-[#57c785]/20 bg-[linear-gradient(180deg,rgba(87,199,133,0.10),rgba(28,28,30,0.88))]",
      };
    case "dinner":
      return {
        chip: "border-[#ff8a5b]/30 bg-[#ff8a5b]/12 text-[#ffc0a8]",
        card:
          "border-[#ff8a5b]/20 bg-[linear-gradient(180deg,rgba(255,138,91,0.11),rgba(28,28,30,0.88))]",
      };
    default:
      return {
        chip: "border-accent-primary/25 bg-accent-primary/10 text-accent-primary",
        card:
          "border-accent-primary/20 bg-[linear-gradient(180deg,rgba(11,95,255,0.11),rgba(28,28,30,0.88))]",
      };
  }
};

const formatTag = (tag: string) =>
  tag.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const MealMacroPill = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-full border border-base-white/10 bg-base-white/6 px-3 py-1.5">
    <p className="text-[10px] uppercase tracking-[0.18em] text-grey-500">
      {label}
    </p>
    <p className="mt-1 text-label-lg text-base-white">{value}</p>
  </div>
);

const MealOptionCard = ({
  option,
  featured = false,
  accentCardClass = "",
}: {
  option: MealOption;
  featured?: boolean;
  accentCardClass?: string;
}) => {
  const ingredientPreview = option.ingredients
    .slice(0, 3)
    .map((ingredient) => ingredient.item)
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        featured
          ? accentCardClass
          : "border-grey-700/45 bg-grey-900/55"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-h3 text-base-white">{option.name}</p>
          {ingredientPreview && (
            <p className="mt-1 line-clamp-2 text-body text-grey-400">
              {ingredientPreview}
            </p>
          )}
        </div>
        {featured && (
          <span className="shrink-0 rounded-full border border-accent-primary/20 bg-accent-primary/12 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-primary">
            Best pick
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <MealMacroPill label="Kcal" value={String(option.macros.calories)} />
        <MealMacroPill label="Protein" value={`${option.macros.protein}g`} />
        <MealMacroPill label="Carbs" value={`${option.macros.carbs}g`} />
        <MealMacroPill label="Fat" value={`${option.macros.fat}g`} />
      </div>

      {option.dietaryTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {option.dietaryTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-grey-700/40 bg-grey-900/65 px-2.5 py-1 text-caption text-grey-300"
            >
              {formatTag(tag)}
            </span>
          ))}
        </div>
      )}

      {option.prepNote && (
        <p className="mt-3 text-caption text-grey-500">{option.prepNote}</p>
      )}
    </div>
  );
};

const MealPlanCard = ({ meal }: { meal: DayMeal }) => {
  const [featuredOption, ...alternateOptions] = meal.options;
  const [isVisible, setIsVisible] = useState(false);
  const accent = getMealAccent(meal.mealType);

  useEffect(() => {
    setIsVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [meal.mealType]);

  return (
    <div
      className="rounded-[24px] border border-grey-700/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(10,10,14,0.28))] p-4"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0px)" : "translateY(10px)",
        transition: "opacity 220ms ease, transform 260ms ease",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-grey-500">
            {formatMealType(meal.mealType)}
          </p>
          <p className="mt-1 text-body text-grey-400">{meal.timingNote}</p>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-caption ${accent.chip}`}>
          {meal.targetMacros.calories} kcal target
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {featuredOption && (
          <MealOptionCard
            option={featuredOption}
            featured
            accentCardClass={accent.card}
          />
        )}

        {alternateOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-caption uppercase tracking-[0.18em] text-grey-500">
              Alternate options
            </p>
            {alternateOptions.slice(0, 1).map((option, index) => (
              <MealOptionCard
                key={`${meal.mealType}-${option.name}-${index}`}
                option={option}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const HomeDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { data: meData } = useGetMeQuery();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetHomeDashboardQuery();
  const [updateTodayProgress, { isLoading: isUpdatingProgress }] =
    useUpdateTodayProgressMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStepLogOpen, setIsStepLogOpen] = useState(false);
  const [stepsToLog, setStepsToLog] = useState("");
  const [animatedKcalProgress, setAnimatedKcalProgress] = useState(0);
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);

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

  if ((isLoading || isFetching) && !data) return <DashboardSkeleton />;

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
  const selectedMeal =
    todayPlan?.meals[selectedMealIndex] ?? todayPlan?.meals[0] ?? null;
  const user = meData?.data?.user;
  const hour = new Date().getHours();
  const greetingPrefix =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const userName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    d.greetingTitle ||
    "there";

  useEffect(() => {
    setSelectedMealIndex(0);
  }, [todayPlan?.dayNumber]);
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

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-grey-700/50 bg-grey-900/40 transition-all hover:bg-grey-900/70 active:scale-95"
        >
          {theme === "dark" ? (
            // Sun icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            // Moon icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

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
        <div className="mb-4 rounded-[26px] border border-grey-700/50 bg-[radial-gradient(circle_at_top_left,rgba(11,95,255,0.15),rgba(28,28,30,0.92)_42%,rgba(14,14,18,0.98)_100%)] p-5 shadow-card-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label-sm uppercase tracking-[0.2em] text-accent-primary/80">
                Today's Plan
              </p>
              <h2 className="mt-2 text-h2">
                {todayPlan ? `${todayPlan.dayLabel} menu` : "Fresh ideas for today"}
              </h2>
              <p className="mt-1 max-w-[30ch] text-body text-grey-400">
                {todayPlan
                  ? "A cleaner, hunger-inducing view of your next meals, built around your targets."
                  : "Refreshed every 7 days from your onboarding profile and goal."}
              </p>
            </div>
            <div className="rounded-full border border-base-white/10 bg-base-white/6 px-3 py-1.5 text-caption text-grey-300">
              Updated {lastGeneratedLabel}
            </div>
          </div>

          {todayPlan ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] border border-base-white/10 bg-base-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-caption uppercase tracking-[0.18em] text-grey-500">
                      Daily focus
                    </p>
                    <p className="mt-1 text-body-lg text-base-white">
                      {d.planSummary}
                    </p>
                  </div>
                  <div className="rounded-full border border-accent-primary/18 bg-accent-primary/10 px-3 py-1.5 text-caption text-accent-primary">
                    {todayPlan.meals.length} meals
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <MealMacroPill
                    label="Kcal"
                    value={String(todayPlan.dailyTargets.calories)}
                  />
                  <MealMacroPill
                    label="Protein"
                    value={`${todayPlan.dailyTargets.protein}g`}
                  />
                  <MealMacroPill
                    label="Carbs"
                    value={`${todayPlan.dailyTargets.carbs}g`}
                  />
                  <MealMacroPill
                    label="Fat"
                    value={`${todayPlan.dailyTargets.fat}g`}
                  />
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                {todayPlan.meals.map((meal, mealIdx) => {
                  const isActive = mealIdx === selectedMealIndex;
                  const accent = getMealAccent(meal.mealType);

                  return (
                    <button
                      key={`${todayPlan.dayNumber}-${meal.mealType}-${mealIdx}`}
                      type="button"
                      onClick={() => setSelectedMealIndex(mealIdx)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-label-sm transition-all duration-200 ${
                        isActive
                          ? `${accent.chip} shadow-[0_8px_20px_rgba(0,0,0,0.18)]`
                          : "border-grey-700/50 bg-grey-900/55 text-grey-300 hover:border-grey-500/70 hover:bg-grey-900/75"
                      }`}
                    >
                      {formatMealType(meal.mealType)}
                    </button>
                  );
                })}
              </div>

              {selectedMeal && (
                <MealPlanCard
                  key={`${todayPlan.dayNumber}-${selectedMeal.mealType}-${selectedMealIndex}`}
                  meal={selectedMeal}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-grey-700/45 bg-grey-900/50 p-4">
                  <p className="text-caption uppercase tracking-[0.18em] text-grey-500">
                    Daily Habit
                  </p>
                  <p className="mt-2 text-body text-grey-300">
                    {todayPlan.habitNote}
                  </p>
                </div>

                <div className="rounded-[22px] border border-grey-700/45 bg-grey-900/50 p-4">
                  <p className="text-caption uppercase tracking-[0.18em] text-grey-500">
                    Workout
                  </p>
                  <p className="mt-2 text-body text-grey-300">
                    {todayPlan.workoutNote}
                  </p>
                </div>
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
