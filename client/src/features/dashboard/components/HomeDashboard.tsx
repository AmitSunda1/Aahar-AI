import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader } from "../../../components/ui/Loader";
import {
  useGetHomeDashboardQuery,
  useUpdateTodayProgressMutation,
} from "../dashboardApi";
import { DashboardTestingPanel } from "./DashboardTestingPanel";
import type {
  DashboardInsight,
  UpdateTodayProgressRequest,
  WeightPoint,
} from "../dashboard.types";

const MacroRing = ({
  value,
  target,
  label,
}: {
  value: number;
  target: number;
  label: string;
}) => {
  const progress =
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(209, 209, 214, 0.22)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0B5FFF"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-base-white text-[24px] font-semibold"
        >
          {value}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-grey-500 text-[12px]"
        >
          /{target}g
        </text>
      </svg>
      <p className="text-body-lg text-grey-300">{label}</p>
    </div>
  );
};

const WeightChart = ({ points }: { points: WeightPoint[] }) => {
  if (points.length === 0) return null;

  const width = 100;
  const height = 44;
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = Math.max(0.5, max - min);

  const plotted = points.map((p, idx) => {
    const x = (idx / Math.max(1, points.length - 1)) * width;
    const normalized = (p.value - min) / range;
    const y = height - normalized * (height - 6) - 3;
    return { x, y, ...p };
  });

  const pathD = plotted
    .map(
      (pt, idx) =>
        `${idx === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`,
    )
    .join(" ");

  return (
    <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/40 p-4 shadow-card-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-h3">Weight</h3>
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-accent-primary text-[28px] leading-none text-base-white"
        >
          +
        </button>
      </div>

      <div className="mb-3 inline-flex rounded-full border border-accent-primary/40 bg-accent-primary/15 px-4 py-1 text-label-lg text-accent-primary">
        Last 7 days
      </div>

      <svg viewBox="0 0 100 44" className="h-36 w-full">
        <line
          x1="0"
          y1="12"
          x2="100"
          y2="12"
          stroke="rgba(209,209,214,0.35)"
          strokeWidth="0.4"
        />
        <line
          x1="0"
          y1="22"
          x2="100"
          y2="22"
          stroke="rgba(209,209,214,0.35)"
          strokeWidth="0.4"
        />
        <line
          x1="0"
          y1="32"
          x2="100"
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
      </svg>

      <div className="mb-4 mt-1 flex items-center justify-between text-body text-grey-500">
        {points.map((point, idx) => (
          <span
            key={`${point.label}-${idx}`}
            className={idx === points.length - 1 ? "text-accent-primary" : ""}
          >
            {point.label}
          </span>
        ))}
      </div>

      <div className="border-t border-grey-700/50 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-body-lg text-grey-500">Current</p>
          <p className="text-h2">
            {points[points.length - 1].value.toFixed(1)} kg
          </p>
        </div>
      </div>
    </div>
  );
};

const InsightCard = ({ insight }: { insight: DashboardInsight }) => {
  const toneClass =
    insight.tone === "positive"
      ? "bg-accent-primary/15 text-accent-primary"
      : insight.tone === "warning"
        ? "bg-semantic-warning/20 text-semantic-warning"
        : "bg-grey-700/30 text-grey-300";

  return (
    <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}
        >
          <span className="text-body-lg">↗</span>
        </div>
        <div>
          <h4 className="text-h3">{insight.title}</h4>
          <p className="mt-1 text-body text-grey-500">{insight.subtitle}</p>
        </div>
      </div>
    </div>
  );
};

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
  const { data, isLoading, isFetching, isError, refetch } =
    useGetHomeDashboardQuery();
  const [updateTodayProgress, { isLoading: isUpdatingProgress }] =
    useUpdateTodayProgressMutation();
  const [actionError, setActionError] = useState<string | null>(null);

  const lastGeneratedLabel = useMemo(() => {
    if (!data?.meta?.lastPlanGeneratedAt) return "Not generated yet";
    return new Date(data.meta.lastPlanGeneratedAt).toLocaleString();
  }, [data?.meta?.lastPlanGeneratedAt]);

  const handleProgressUpdate = async (payload: UpdateTodayProgressRequest) => {
    setActionError(null);

    try {
      await updateTodayProgress(payload).unwrap();
      await refetch();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to update today's progress";
      setActionError(message);
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

  return (
    <div className="bg-base-black px-4 pb-8 pt-4 text-base-white">
      <div className="mb-4">
        <div>
          <h1 className="text-h1">{d.greetingTitle}</h1>
          <p className="mt-1 text-body text-grey-500">
            {meta.hasActivePlan
              ? "Saved dashboard targets"
              : "Starter dashboard targets"}{" "}
            • {d.todayStatus.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {!meta.canUseGemini && (
        <div className="mb-4 rounded-[18px] border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-body text-grey-300">
          Gemini is not configured on the server. Daily targets are still based
          on onboarding data and goal.
        </div>
      )}

      {meta.aiSuggestionsStatus === "gemini_unavailable" && (
        <div className="mb-4 rounded-[18px] border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-body text-grey-300">
          Weekly AI suggestions are temporarily unavailable due to Gemini quota
          limits. Existing suggestions are kept and auto-refresh will retry.
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-[18px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-grey-300">
          {actionError}
        </div>
      )}

      <section className="rounded-[26px] border border-grey-700/50 bg-gradient-to-r from-grey-900/85 to-grey-900/35 p-5 shadow-card-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-label-lg uppercase text-grey-300">Eaten</p>
            <p className="text-[50px] leading-[50px] font-semibold">
              {d.caloriesEaten}
            </p>
            <p className="text-body text-grey-500">kcal</p>
          </div>

          <div className="relative flex h-[182px] w-[182px] items-center justify-center rounded-full border-[14px] border-grey-700/80">
            <div className="text-center">
              <p className="text-[62px] leading-[56px] font-semibold">
                {d.caloriesLeft}
              </p>
              <p className="mt-1 text-label-lg uppercase text-grey-300">
                kcal left
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-label-lg uppercase text-grey-300">Burned</p>
            <p className="text-[50px] leading-[50px] font-semibold">
              {d.caloriesBurned}
            </p>
            <p className="text-body text-grey-500">kcal</p>
          </div>
        </div>

        <div className="my-6 border-t border-grey-700/70" />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-label-lg uppercase text-grey-300">Carbs</p>
            <p className="text-h2">
              {d.macros.carbsConsumed}
              <span className="text-body text-grey-300">
                /{d.macros.carbs}g
              </span>
            </p>
          </div>
          <div>
            <p className="text-label-lg uppercase text-grey-300">Protein</p>
            <p className="text-h2">
              {d.macros.proteinConsumed}
              <span className="text-body text-grey-300">
                /{d.macros.protein}g
              </span>
            </p>
          </div>
          <div>
            <p className="text-label-lg uppercase text-grey-300">Fat</p>
            <p className="text-h2">
              {d.macros.fatConsumed}
              <span className="text-body text-grey-300">/{d.macros.fat}g</span>
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-h2">Macros</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
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
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-semantic-error/20 text-semantic-error">
            <span className="text-[22px]">◔</span>
          </div>
          <p className="text-h2">Steps</p>
          <p className="mt-2 text-[54px] leading-[52px] font-semibold">
            {d.stepCount}
          </p>
          <p className="text-body text-grey-500">
            Goal: {d.stepGoal.toLocaleString()} steps
          </p>
          <div className="mt-5 h-2 rounded-full bg-grey-700/45">
            <div
              className="h-full rounded-full bg-accent-primary"
              style={{
                width: `${Math.min(100, (d.stepCount / Math.max(1, d.stepGoal)) * 100)}%`,
              }}
            />
          </div>
          <Link
            to="/profile"
            className="mt-5 block text-h3 text-accent-primary"
          >
            Connect wearables
          </Link>
        </div>

        <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-semantic-warning/20 text-semantic-warning">
            <span className="text-[22px]">⌁</span>
          </div>
          <p className="text-h2">Exercise</p>
          <p className="mt-2 text-[54px] leading-[52px] font-semibold">
            {d.exerciseCalories} kcal
          </p>
          <p className="text-body text-grey-500">
            {String(Math.floor(d.exerciseDurationMinutes / 60)).padStart(
              2,
              "0",
            )}
            :{String(d.exerciseDurationMinutes % 60).padStart(2, "0")} hr
          </p>
          <button
            type="button"
            className="mt-6 h-14 w-full rounded-full border border-accent-primary/70 text-[40px] leading-none text-accent-primary"
          >
            +
          </button>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 rounded-[20px] border border-grey-700/50 bg-grey-900/40 p-4">
          <h2 className="text-h2">Weekly Suggestions</h2>
          <p className="mt-1 text-body text-grey-500">
            Refreshed every 7 days from your onboarding profile and goal. Last
            refresh: {lastGeneratedLabel}
          </p>
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
        </div>

        <WeightChart points={d.weightTrendKg} />
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <NavQuickAction to="/log-food/scan" title="Scan Food" active />
        <NavQuickAction to="/profile" title="AI Coach" />
      </section>

      <section className="mt-7">
        <h2 className="text-h2">Insights</h2>
        <div className="mt-4 space-y-3">
          {d.insights.map((insight, idx) => (
            <InsightCard insight={insight} key={`${insight.title}-${idx}`} />
          ))}
        </div>
      </section>

      <DashboardTestingPanel
        onSubmit={handleProgressUpdate}
        isSubmitting={isUpdatingProgress}
      />

      <p className="mt-6 text-center text-caption text-grey-500">
        Data source: {d.source}
      </p>
    </div>
  );
};

const NavQuickAction = ({
  to,
  title,
  active = false,
}: {
  to: string;
  title: string;
  active?: boolean;
}) => {
  return (
    <Link
      to={to}
      className={`flex h-36 items-center justify-center rounded-[24px] border px-4 text-center text-h2 transition-colors ${
        active
          ? "border-accent-primary bg-accent-primary text-base-white shadow-[0_10px_30px_rgba(11,95,255,0.22)]"
          : "border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 text-base-white"
      }`}
    >
      {title}
    </Link>
  );
};
