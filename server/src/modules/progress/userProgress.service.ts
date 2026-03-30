import mongoose from "mongoose";
import UserProgress from "./userProgress.model";
import type {
  DailyActuals,
  DailyProgressStatus,
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

  const mergedActuals: DailyActuals = {
    ...defaults,
    ...previousActuals,
    ...actualsPatch,
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
