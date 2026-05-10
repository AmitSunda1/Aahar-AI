import { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../app/ThemeContext";
import { RevealSection } from "../../../components/ui/RevealSection";
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
const DARK_CARD_BORDER_CLASS =
  "border border-transparent [background:padding-box_linear-gradient(180deg,rgba(15,17,24,0.96),rgba(10,12,18,0.88)),border-box_linear-gradient(135deg,rgba(255,255,255,0.18),rgba(11,95,255,0.22)_38%,rgba(255,255,255,0.08)_72%,rgba(255,255,255,0.15))]";
const DARK_CARD_BORDER_SOFT_CLASS =
  "border border-transparent [background:padding-box_linear-gradient(180deg,rgba(16,18,24,0.92),rgba(11,13,19,0.84)),border-box_linear-gradient(135deg,rgba(255,255,255,0.14),rgba(11,95,255,0.16)_40%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.12))]";

const MacroRing = ({
  value,
  target,
  label,
}: {
  value: number;
  target: number;
  label: string;
}) => {
  const { isDark } = useTheme();
  const rawProgress = target > 0 ? (value / target) * 100 : 0;
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const size = 96;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;
  const progressStroke = FILL_COLOR;
  const surfaceClass = isDark
    ? `${DARK_CARD_BORDER_SOFT_CLASS} shadow-[0_14px_34px_rgba(0,0,0,0.24)]`
    : "border-base-white/[0.08] bg-grey-900/45";

  useEffect(() => {
    setAnimatedProgress(0);
    const frame = window.requestAnimationFrame(() => {
      setAnimatedProgress(progress);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [progress]);

  return (
    <div
      className={`flex min-w-0 flex-col items-center rounded-[22px] border px-2 py-4 ${surfaceClass}`}
    >
      <svg width="100%" height="auto" viewBox={`0 0 ${size} ${size}`} className="max-w-[84px] xs:max-w-[96px]">
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
          className="fill-grey-500 text-[13px]"
        >
          /{target}g
        </text>
      </svg>
      <p className="mt-1 text-center text-[12px] font-semibold text-grey-300">{label}</p>
      <p className="text-center text-caption text-grey-500">
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
  const { isDark } = useTheme();
  const [isWeightLogOpen, setIsWeightLogOpen] = useState(false);
  const [weightToLog, setWeightToLog] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const validPoints = points.filter((point) => Number.isFinite(point.value));

  if (validPoints.length === 0) return null;

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
    <div
      className={`rounded-[24px] p-4 shadow-card-md ${isDark
        ? `${DARK_CARD_BORDER_CLASS} shadow-[0_20px_44px_rgba(0,0,0,0.28)]`
        : "border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/40"
        }`}
    >
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
        card: "bg-accent-primary/10",
      };
    case "lunch":
      return {
        chip: "border-[#57c785]/30 bg-[#57c785]/12 text-[#95f0b6]",
        card: "bg-accent-primary/10",
      };
    case "dinner":
      return {
        chip: "border-[#ff8a5b]/30 bg-[#ff8a5b]/12 text-[#ffc0a8]",
        card: "bg-accent-primary/10",
      };
    default:
      return {
        chip: "border-accent-primary/25 bg-accent-primary/10 text-accent-primary",
        card: "bg-accent-primary/10",
      };
  }
};

const formatTag = (tag: string) =>
  tag.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const mealTabAccentClass =
  "border-accent-primary/25 bg-accent-primary/10 text-accent-primary";

const MealMacroPill = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[6px] border border-base-white/10 bg-base-white/6 px-3 py-1.5">
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
      className={`rounded-[20px] p-4 ${featured
        ? accentCardClass
        : "border border-grey-700/45 bg-grey-900/55"
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

      <div className="mt-3 grid grid-cols-2 gap-2">
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
      // className="rounded-[24px] bg-base-white/[0.04] p-4"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0px)" : "translateY(10px)",
        transition: "opacity 220ms ease, transform 260ms ease",
      }}
    >
      {/* <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-grey-500">
            {formatMealType(meal.mealType)}
          </p>
          <p className="mt-1 text-body text-grey-400">{meal.timingNote}</p>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-caption ${accent.chip}`}>
          {meal.targetMacros.calories} kcal target
        </div>
      </div> */}

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

  // const lastGeneratedLabel = useMemo(() => {
  //   if (!data?.meta?.lastPlanGeneratedAt) return "Not generated yet";
  //   return new Date(data.meta.lastPlanGeneratedAt).toLocaleString();
  // }, [data?.meta?.lastPlanGeneratedAt]);

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

  const todayIsoDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayPlan =
    data?.data.weeklyMealPlan?.days.find((day) => day.dayNumber === todayIsoDay) ??
    data?.data.weeklyMealPlan?.days[0];

  useEffect(() => {
    setSelectedMealIndex(0);
  }, [todayPlan?.dayNumber]);

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
  const kcalRingSize = 150;
  const kcalRingStroke = 12;
  const kcalRingRadius = (kcalRingSize - kcalRingStroke) / 2;
  const kcalRingCircumference = 2 * Math.PI * kcalRingRadius;
  const kcalRingOffset =
    kcalRingCircumference -
    (animatedKcalProgress / 100) * kcalRingCircumference;
  const selectedMeal =
    todayPlan?.meals[selectedMealIndex] ?? todayPlan?.meals[0] ?? null;
  const user = meData?.data?.user;
  const hour = new Date().getHours();
  const greetingPrefix =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const userName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    d.greetingTitle ||
    "there";
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const isDark = theme === "dark";
  const dashboardCardClass = isDark
    ? `${DARK_CARD_BORDER_CLASS} shadow-[0_20px_60px_rgba(0,0,0,0.32)]`
    : "border-base-white/[0.08] bg-grey-900/45";
  const activityCardClass = isDark
    ? `${DARK_CARD_BORDER_SOFT_CLASS} shadow-[0_18px_42px_rgba(0,0,0,0.26)]`
    : "border-base-white/[0.08] bg-grey-900/50";
  const planCardClass = isDark
    ? `${DARK_CARD_BORDER_CLASS} shadow-[0_20px_48px_rgba(0,0,0,0.28)]`
    : "border-grey-700/35 bg-grey-900/70";
  const planNoteClass = isDark ? "bg-base-white/[0.04]" : "bg-grey-900/55";

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
    <div className="bg-base-black px-5 pb-10 pt-[max(28px,env(safe-area-inset-top))] text-base-white">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="rounded-full border border-accent-primary/25 bg-accent-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-primary">
            {dateLabel}
          </p>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-base-white/[0.1] bg-base-white/[0.05] text-base-white transition-all hover:bg-base-white/[0.09] active:scale-95"
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

        <h1 className="text-[31px] font-semibold leading-[38px] tracking-normal">
          {`${greetingPrefix}, ${userName}`}
        </h1>
      </div>

      {actionError && (
        <div className="mb-4 rounded-[18px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-grey-300">
          {actionError}
        </div>
      )}

      <RevealSection
        className={`rounded-[28px] border p-5  ${dashboardCardClass}`}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-primary">
              Today's energy
            </p>
            <h2 className="mt-1 text-[22px] font-semibold leading-7">
              Calorie balance
            </h2>
          </div>
          <p className="rounded-full border border-base-white/[0.08] bg-base-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-grey-300">
            Goal {d.calorieGoal} kcal
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-[150px] w-[150px] items-center justify-center">
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
              <p className="text-[38px] leading-[38px] font-semibold">
                {d.caloriesLeft}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-grey-300">
                kcal left
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-base-white/[0.08] bg-base-white/[0.05] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-grey-500">
              Eaten
            </p>
            <p className="mt-1 text-[20px] font-semibold leading-6">{d.caloriesEaten}</p>
            <p className="text-[11px] text-grey-500">kcal</p>
          </div>
          <div className="rounded-[18px] border border-base-white/[0.08] bg-base-white/[0.05] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-grey-500">
              Left
            </p>
            <p className="mt-1 text-[20px] font-semibold leading-6">{d.caloriesLeft}</p>
            <p className="text-[11px] text-grey-500">kcal</p>
          </div>
          <div className="rounded-[18px] border border-base-white/[0.08] bg-base-white/[0.05] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-grey-500">
              Burned
            </p>
            <p className="mt-1 text-[20px] font-semibold leading-6">{d.caloriesBurned}</p>
            <p className="text-[11px] text-grey-500">kcal</p>
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

      <RevealSection
        className={`mt-5 rounded-[28px] border p-5 shadow-card ${dashboardCardClass}`}
        delay={60}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-grey-500">
              Nutrition
            </p>
            <h2 className="mt-1 text-[22px] font-semibold leading-7">Macros</h2>
          </div>
          <span className="rounded-full border border-grey-700/50 bg-grey-900/70 px-3 py-1.5 text-[12px] font-medium text-grey-300">
            Today
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MacroRing
            value={d.macros.carbsConsumed}
            target={d.macros.carbs}
            label="Carbs"
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

      <RevealSection className="mt-5" delay={120}>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-grey-500">
              Movement
            </p>
            <h2 className="mt-1 text-[22px] font-semibold leading-7">Activity</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3">
          <div className={`flex min-h-[198px] flex-col rounded-[24px] border p-4 shadow-card ${activityCardClass}`}>
            <p className="text-[15px] font-semibold text-grey-300">Steps</p>
            <p className="mt-2 text-[28px] leading-[32px] font-semibold">
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

          <div className={`flex min-h-[198px] flex-col rounded-[24px] border p-4 shadow-card ${activityCardClass}`}>
            <p className="text-[15px] font-semibold text-grey-300">Exercise</p>
            <p className="mt-2 text-[28px] leading-[32px] font-semibold">
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
              className="mt-auto h-11 w-full rounded-full border border-accent-primary/50 bg-accent-primary/10 text-[30px] leading-none text-accent-primary transition-colors hover:bg-accent-primary/15"
            >
              +
            </button>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="mt-7" delay={180}>
        <div className={`mb-4 rounded-[26px] border p-5 shadow-card-md ${planCardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label-sm uppercase tracking-[0.2em] text-accent-primary/80">
                Today's Plan
              </p>
              <h2 className="mt-2 text-h2">
                {todayPlan ? "Today's menu" : "Fresh ideas for today"}
              </h2>
              <p className="mt-1 max-w-[30ch] text-body text-grey-400">
                {todayPlan
                  ? "Simple meal picks for the day, tuned to your targets and easy to scan."
                  : "Refreshed every 7 days from your onboarding profile and goal."}
              </p>
            </div>
            {/* {todayPlan && (
              <div className="rounded-full bg-base-white/8 px-3 py-1.5 text-caption text-grey-300">
                {todayPlan.dayLabel} • {todayPlan.meals.length} meals
              </div>
            )} */}
          </div>

          {todayPlan ? (
            <div className="mt-5 space-y-4">
              {/* <div className="rounded-[22px] border border-base-white/10 bg-base-white/5 p-4">
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
              </div> */}

              <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-hide">
                {todayPlan.meals.map((meal, mealIdx) => {
                  const isActive = mealIdx === selectedMealIndex;

                  return (
                    <button
                      key={`${todayPlan.dayNumber}-${meal.mealType}-${mealIdx}`}
                      type="button"
                      onClick={() => setSelectedMealIndex(mealIdx)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-label-sm transition-all duration-200 ${isActive
                        ? `${mealTabAccentClass} shadow-[0_8px_20px_rgba(0,0,0,0.18)]`
                        : "bg-base-white/6 text-grey-300 hover:bg-base-white/10"
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
                <div className={`rounded-[20px] p-4 ${planNoteClass}`}>
                  <p className="text-caption uppercase tracking-[0.18em] text-base-white">
                    Daily Habit
                  </p>
                  <p className="mt-2 text-body text-grey-300">
                    {todayPlan.habitNote}
                  </p>
                </div>

                <div className={`rounded-[20px] p-4 ${planNoteClass}`}>
                  <p className="text-caption uppercase tracking-[0.18em] text-base-white">
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
