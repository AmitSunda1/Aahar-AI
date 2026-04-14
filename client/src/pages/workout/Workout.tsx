import { useEffect, useMemo, useState } from "react";
import { Loader } from "../../components/ui/Loader";
import {
  useCompleteWorkoutSessionMutation,
  useGetHomeDashboardQuery,
} from "../../features/dashboard/dashboardApi";

const WORKOUT_TIMER_STORAGE_KEY = "aahar:workout-timer-started-at";

const getIsoDayNumber = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const getWeekStart = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const formatClock = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const estimateCaloriesBurned = (minutes: number) =>
  Math.max(30, Math.round(minutes * 6));

export const Workout = () => {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetHomeDashboardQuery();
  const [completeWorkoutSession, { isLoading: isSavingSession }] =
    useCompleteWorkoutSessionMutation();
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const weeklyPlan = data?.data.weeklyMealPlan;
  const workoutSessions = data?.data.workoutSessions ?? [];
  const todayDayNumber = getIsoDayNumber(new Date());
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartKey = weekStart.toISOString().slice(0, 10);
  const weekEndKey = weekEnd.toISOString().slice(0, 10);
  const todayDateKey = new Date().toISOString().slice(0, 10);

  const weeklyDays = useMemo(() => weeklyPlan?.days ?? [], [weeklyPlan]);

  const todayWorkout = useMemo(
    () => weeklyDays.find((day) => day.dayNumber === todayDayNumber),
    [weeklyDays, todayDayNumber],
  );

  const todaySession = useMemo(
    () =>
      workoutSessions.find(
        (entry) =>
          entry.dateKey === todayDateKey && entry.dayNumber === todayDayNumber,
      ),
    [workoutSessions, todayDateKey, todayDayNumber],
  );

  const sessionsThisWeek = useMemo(
    () =>
      workoutSessions.filter(
        (entry) => entry.dateKey >= weekStartKey && entry.dateKey <= weekEndKey,
      ),
    [workoutSessions, weekStartKey, weekEndKey],
  );

  const completedCount = sessionsThisWeek.length;
  const completedMinutes = sessionsThisWeek.reduce(
    (sum, session) => sum + session.actualMinutes,
    0,
  );
  const completedCalories = sessionsThisWeek.reduce(
    (sum, session) => sum + session.caloriesBurned,
    0,
  );

  useEffect(() => {
    try {
      const persisted = window.localStorage.getItem(WORKOUT_TIMER_STORAGE_KEY);
      if (!persisted) return;

      const parsed = Number(persisted);
      const now = Date.now();
      const ageMs = now - parsed;

      if (!Number.isFinite(parsed) || parsed <= 0 || ageMs < 0) {
        window.localStorage.removeItem(WORKOUT_TIMER_STORAGE_KEY);
        return;
      }

      // Ignore stale timers older than 24h.
      if (ageMs > 24 * 60 * 60 * 1000) {
        window.localStorage.removeItem(WORKOUT_TIMER_STORAGE_KEY);
        return;
      }

      setTimerStartedAt(parsed);
    } catch {
      // No-op when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      if (timerStartedAt) {
        window.localStorage.setItem(
          WORKOUT_TIMER_STORAGE_KEY,
          String(timerStartedAt),
        );
      } else {
        window.localStorage.removeItem(WORKOUT_TIMER_STORAGE_KEY);
      }
    } catch {
      // No-op when storage is unavailable.
    }
  }, [timerStartedAt]);

  useEffect(() => {
    if (!timerStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)),
      );
    }, 1000);

    setElapsedSeconds(
      Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)),
    );

    return () => window.clearInterval(interval);
  }, [timerStartedAt]);

  const startTimer = () => {
    if (!todayWorkout) {
      setActionError("No workout planned for today.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setTimerStartedAt(Date.now());
  };

  const stopAndSave = async () => {
    if (!todayWorkout) {
      setActionError("No workout planned for today.");
      return;
    }

    const startedAt = timerStartedAt ?? Date.now() - 30 * 60 * 1000;
    const completedAt = Date.now();
    const actualMinutes = Math.max(
      1,
      Math.round((completedAt - startedAt) / 60000),
    );

    setActionError(null);
    setActionMessage(null);

    try {
      await completeWorkoutSession({
        dayNumber: todayWorkout.dayNumber,
        dayLabel: todayWorkout.dayLabel,
        workoutTitle:
          todayWorkout.workoutNote || `${todayWorkout.dayLabel} workout`,
        plannedMinutes: data?.data.exerciseDurationMinutes ?? actualMinutes,
        actualMinutes,
        caloriesBurned: estimateCaloriesBurned(actualMinutes),
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date(completedAt).toISOString(),
        notes: [todayWorkout.workoutNote || "Workout completed"],
      }).unwrap();

      setActionMessage("Workout saved.");
      setTimerStartedAt(null);
      setElapsedSeconds(0);
      await refetch();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Could not save this workout right now.";
      setActionError(message);
    }
  };

  if ((isLoading || isFetching) && !data) return <Loader />;

  if (isError || !data?.data.weeklyMealPlan) {
    return (
      <div className="px-4 pt-6 text-base-white">
        <div className="rounded-[20px] border border-semantic-error/40 bg-semantic-error/10 p-4">
          <h2 className="text-h3">Workout plan unavailable</h2>
          <p className="mt-2 text-body text-grey-300">
            Generate your dashboard plan first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
      <section className="mb-6 rounded-[26px] border border-grey-700/50 bg-[radial-gradient(circle_at_top_left,rgba(11,95,255,0.22),rgba(9,9,13,0.2)_38%,rgba(9,9,13,0.9)_100%)] p-5 shadow-card-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-grey-600/70 bg-grey-900/50 px-3 py-1 text-label-sm uppercase tracking-[0.16em] text-grey-300">
              Today
            </p>
            <h1 className="mt-3 text-h1">Workout</h1>
            <p className="mt-1 text-body text-grey-400">
              {formatDateLabel(new Date())}
            </p>
          </div>

          <div className="rounded-[18px] border border-grey-700/60 bg-grey-900/45 px-4 py-3 text-right">
            <p className="text-label-sm uppercase text-grey-500">Status</p>
            <p className="mt-1 text-body-lg font-medium text-base-white">
              {todaySession ? "Done" : todayWorkout ? "Planned" : "Rest"}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="rounded-[26px] border border-grey-700/50 bg-gradient-to-r from-grey-900/85 to-grey-900/35 p-5 shadow-card-lg mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-label-lg uppercase text-grey-300">Done</p>
            <p className="mt-2 text-[34px] leading-[36px] font-semibold">
              {completedCount}
            </p>
            <p className="text-body text-grey-500">/7 days</p>
          </div>
          <div>
            <p className="text-label-lg uppercase text-grey-300">Minutes</p>
            <p className="mt-2 text-[34px] leading-[36px] font-semibold">
              {completedMinutes}
            </p>
            <p className="text-body text-grey-500">total</p>
          </div>
          <div>
            <p className="text-label-lg uppercase text-grey-300">Burned</p>
            <p className="mt-2 text-[34px] leading-[36px] font-semibold">
              {completedCalories}
            </p>
            <p className="text-body text-grey-500">kcal</p>
          </div>
        </div>
      </section>

      {actionError && (
        <div className="mb-4 rounded-[18px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-grey-300">
          {actionError}
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded-[18px] border border-semantic-success/40 bg-semantic-success/10 p-4 text-body text-grey-300">
          {actionMessage}
        </div>
      )}

      {/* Today's Workout Session */}
      <section className="rounded-[26px] border border-grey-700/50 bg-gradient-to-r from-grey-900/85 to-grey-900/35 p-5 shadow-card-lg mb-6">
        <div className="mb-6">
          <p className="text-label-lg uppercase text-grey-300">Today</p>
          <h2 className="mt-2 text-h2">
            {todayWorkout?.dayLabel ?? "Rest day"}
          </h2>
          <p className="mt-2 text-body text-grey-300">
            {todayWorkout?.workoutNote ?? "No workout planned"}
          </p>
        </div>

        {/* Timer Display */}
        <div className="mb-6 rounded-[24px] border border-accent-primary/30 bg-accent-primary/10 p-6 text-center">
          <p className="text-label-lg uppercase text-accent-primary">
            Session Timer
          </p>
          <p className="mt-4 text-[48px] leading-[48px] font-semibold tabular-nums">
            {formatClock(elapsedSeconds)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startTimer}
            disabled={
              isSavingSession || timerStartedAt !== null || !todayWorkout
            }
            className="h-14 rounded-full bg-accent-primary text-body-lg font-semibold text-base-white transition-all disabled:cursor-not-allowed disabled:bg-grey-700/50 disabled:text-grey-500 hover:enabled:shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
          >
            {timerStartedAt ? "Timer running..." : "Start timer"}
          </button>
          <button
            type="button"
            onClick={stopAndSave}
            disabled={isSavingSession || (!timerStartedAt && !todayWorkout)}
            className="h-14 rounded-full border border-grey-700/50 bg-grey-900/40 text-body-lg font-semibold text-base-white transition-all disabled:cursor-not-allowed disabled:border-grey-700/30 disabled:text-grey-500 hover:enabled:border-grey-600 hover:enabled:bg-grey-900/60"
          >
            {isSavingSession ? "Saving..." : "Stop & Save"}
          </button>
        </div>

        <p className="mt-4 text-caption text-grey-500">
          Start when you begin. Save when you finish.
        </p>
      </section>

      {todaySession && (
        <section className="rounded-[24px] border border-semantic-success/30 bg-semantic-success/10 p-5 shadow-card">
          <p className="text-label-sm uppercase text-semantic-success">
            Today saved
          </p>
          <p className="mt-2 text-body text-grey-300">
            {todaySession.actualMinutes} min • {todaySession.caloriesBurned}{" "}
            kcal
          </p>
          <p className="mt-1 text-caption text-grey-500">
            {new Date(todaySession.completedAt).toLocaleString()}
          </p>
        </section>
      )}
    </div>
  );
};
