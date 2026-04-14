import mongoose from "mongoose";
import UserProgress from "./userProgress.model";
import type {
  DailyActuals,
  DailyProgressStatus,
  WorkoutSession,
  UserDailyProgress,
  UserPlan,
} from "./userProgress.model";

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const calculateAdherenceScore = (
  targets: UserDailyProgress["targets"],
  actuals: DailyActuals,
): number => {
  const checks: number[] = [];

  const nutritionChecks: Array<[number, number]> = [
    [actuals.caloriesConsumed, targets.nutrition.calories],
    [actuals.carbsConsumed, targets.nutrition.carbs],
    [actuals.proteinConsumed, targets.nutrition.protein],
    [actuals.fatConsumed, targets.nutrition.fat],
  ];

  nutritionChecks.forEach(([actual, target]) => {
    if (target > 0) checks.push(Math.min(1, actual / target));
  });

  if (targets.nutrition.waterMl && targets.nutrition.waterMl > 0) {
    checks.push(
      Math.min(1, actuals.waterMlConsumed / targets.nutrition.waterMl),
    );
  }

  if (targets.activity.steps > 0) {
    checks.push(Math.min(1, actuals.stepsCompleted / targets.activity.steps));
  }

  if (targets.activity.exerciseMinutes > 0) {
    checks.push(
      Math.min(
        1,
        actuals.exerciseMinutesCompleted / targets.activity.exerciseMinutes,
      ),
    );
  }

  if (checks.length === 0) return 0;

  const avg = checks.reduce((sum, value) => sum + value, 0) / checks.length;
  return Math.round(avg * 100);
};

const deriveStatus = (
  adherenceScore: number,
  actuals: DailyActuals,
): DailyProgressStatus => {
  const hasAnyProgress = Object.values(actuals).some(
    (value) => typeof value === "number" && value > 0,
  );

  if (!hasAnyProgress) return "not_started";
  if (adherenceScore >= 100) return "completed";
  return "in_progress";
};

export const saveGeneratedPlan = async (
  userId: mongoose.Types.ObjectId | string,
  plan: Omit<UserPlan, "version" | "generatedAt"> & {
    version?: number;
    generatedAt?: Date;
  },
) => {
  const existing = await UserProgress.findOne({ user: userId });
  const nextVersion = plan.version ?? (existing?.activePlan?.version ?? 0) + 1;
  const generatedAt = plan.generatedAt ?? new Date();

  const normalizedPlan: UserPlan = {
    ...plan,
    version: nextVersion,
    generatedAt,
  };

  const progress =
    existing ??
    new UserProgress({
      user: userId,
      planHistory: [],
      dailyProgress: [],
      workoutSessions: [],
    });

  if (progress.activePlan) {
    progress.planHistory.push(progress.activePlan);
  }

  progress.activePlan = normalizedPlan;
  progress.lastPlanGeneratedAt = generatedAt;

  await progress.save();
  return progress;
};

export const upsertDailyProgress = async (
  userId: mongoose.Types.ObjectId | string,
  date: Date,
  actualsPatch: Partial<DailyActuals>,
  notes?: string[],
) => {
  const progress = await UserProgress.findOne({ user: userId });

  if (!progress?.activePlan) {
    throw new Error("No active plan found for user progress");
  }

  const workoutSessions = progress.workoutSessions ?? [];
  progress.workoutSessions = workoutSessions;

  const dateKey = toDateKey(date);
  const targets = {
    nutrition: progress.activePlan.nutrition,
    activity: progress.activePlan.activity,
  };

  const defaults: DailyActuals = {
    caloriesConsumed: 0,
    carbsConsumed: 0,
    proteinConsumed: 0,
    fatConsumed: 0,
    waterMlConsumed: 0,
    stepsCompleted: 0,
    exerciseMinutesCompleted: 0,
    caloriesBurned: 0,
  };

  const existingIndex = progress.dailyProgress.findIndex(
    (entry) => entry.dateKey === dateKey,
  );

  const previousActuals =
    existingIndex >= 0
      ? progress.dailyProgress[existingIndex].actuals
      : defaults;

  // Accumulate numeric values instead of overwriting them
  const mergedActuals: DailyActuals = {
    ...defaults,
    ...previousActuals,
    caloriesConsumed:
      (previousActuals.caloriesConsumed ?? 0) +
      (actualsPatch.caloriesConsumed ?? 0),
    carbsConsumed:
      (previousActuals.carbsConsumed ?? 0) + (actualsPatch.carbsConsumed ?? 0),
    proteinConsumed:
      (previousActuals.proteinConsumed ?? 0) +
      (actualsPatch.proteinConsumed ?? 0),
    fatConsumed:
      (previousActuals.fatConsumed ?? 0) + (actualsPatch.fatConsumed ?? 0),
    waterMlConsumed:
      (previousActuals.waterMlConsumed ?? 0) +
      (actualsPatch.waterMlConsumed ?? 0),
    stepsCompleted:
      (previousActuals.stepsCompleted ?? 0) +
      (actualsPatch.stepsCompleted ?? 0),
    exerciseMinutesCompleted:
      (previousActuals.exerciseMinutesCompleted ?? 0) +
      (actualsPatch.exerciseMinutesCompleted ?? 0),
    caloriesBurned:
      (previousActuals.caloriesBurned ?? 0) +
      (actualsPatch.caloriesBurned ?? 0),
    // Weight should be overwritten with the latest logged value, not accumulated.
    weightKg:
      typeof actualsPatch.weightKg === "number"
        ? actualsPatch.weightKg
        : previousActuals.weightKg,
  };

  const adherenceScore = calculateAdherenceScore(targets, mergedActuals);
  const status = deriveStatus(adherenceScore, mergedActuals);

  const nextEntry: UserDailyProgress = {
    date,
    dateKey,
    targets,
    actuals: mergedActuals,
    adherenceScore,
    status,
    notes,
    completedAt: status === "completed" ? new Date() : undefined,
  };

  if (existingIndex >= 0) {
    progress.dailyProgress[existingIndex] = nextEntry;
  } else {
    progress.dailyProgress.push(nextEntry);
  }

  progress.lastProgressUpdatedAt = new Date();

  await progress.save();
  return nextEntry;
};

export const getUserProgress = async (
  userId: mongoose.Types.ObjectId | string,
) => {
  return UserProgress.findOne({ user: userId });
};

export interface LogWorkoutSessionInput {
  dayNumber: number;
  dayLabel: string;
  workoutTitle: string;
  plannedMinutes: number;
  actualMinutes: number;
  caloriesBurned: number;
  startedAt: Date;
  completedAt: Date;
  notes?: string[];
}

export const logWorkoutSession = async (
  userId: mongoose.Types.ObjectId | string,
  input: LogWorkoutSessionInput,
) => {
  const progress = await UserProgress.findOne({ user: userId });

  if (!progress?.activePlan) {
    throw new Error("No active plan found for user progress");
  }

  const date = input.completedAt;
  const dateKey = toDateKey(date);

  const nextSession: WorkoutSession = {
    date,
    dateKey,
    dayNumber: input.dayNumber,
    dayLabel: input.dayLabel,
    workoutTitle: input.workoutTitle,
    plannedMinutes: input.plannedMinutes,
    actualMinutes: input.actualMinutes,
    caloriesBurned: input.caloriesBurned,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    notes: input.notes,
  };

  const existingIndex = progress.workoutSessions.findIndex(
    (session) =>
      session.dateKey === dateKey && session.dayNumber === input.dayNumber,
  );

  if (existingIndex >= 0) {
    progress.workoutSessions[existingIndex] = nextSession;
  } else {
    progress.workoutSessions.push(nextSession);
  }

  await progress.save();

  await upsertDailyProgress(
    userId,
    date,
    {
      exerciseMinutesCompleted: input.actualMinutes,
      caloriesBurned: input.caloriesBurned,
    },
    input.notes,
  );

  const refreshed = await UserProgress.findOne({ user: userId });
  return {
    session: nextSession,
    progress: refreshed,
  };
};
