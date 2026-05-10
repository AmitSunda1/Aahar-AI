/**
 * Seed Script: 15-Day Realistic Progress Data
 * User: amitsunda14374@gmail.com (Amit Sunda)
 * Profile: Male, 23y, 72kg, 185cm | Goal: build_muscle | Vegetarian
 * Plan targets: 2671 cal | 200g protein | 321g carbs | 65g fat | 2609ml water
 *               6000 steps | 20 min exercise | burn 140 cal
 *
 * Narrative arc:
 *   Week 1 (Days 1–7): Getting started – inconsistent, low adherence, misses some days
 *   Week 2 (Days 8–11): Picking up pace – more consistent, better adherence
 *   Week 3 (Days 12–15): On a roll – hitting targets, strong momentum
 *
 * Run with: npx ts-node scripts/seedDummyProgress.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── Inline minimal Schemas to avoid import chain issues ─────────────────────

const nutritionTargetSchema = new mongoose.Schema(
  {
    calories: Number,
    carbs: Number,
    protein: Number,
    fat: Number,
    waterMl: Number,
  },
  { _id: false },
);

const activityTargetSchema = new mongoose.Schema(
  {
    steps: Number,
    exerciseMinutes: Number,
    burnedCalories: Number,
  },
  { _id: false },
);

const weightTargetSchema = new mongoose.Schema(
  { currentKg: Number, targetKg: Number, weeklyChangeKg: Number },
  { _id: false },
);

const planRecommendationsSchema = new mongoose.Schema(
  { meals: [String], workouts: [String], habits: [String] },
  { _id: false },
);

const userPlanSchema = new mongoose.Schema(
  {
    source: String,
    version: Number,
    generatedAt: Date,
    summary: String,
    nutrition: nutritionTargetSchema,
    activity: activityTargetSchema,
    weight: weightTargetSchema,
    recommendations: planRecommendationsSchema,
    promptContext: String,
    rawResponse: String,
    nutritionProfile: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
);

const dailyActualsSchema = new mongoose.Schema(
  {
    caloriesConsumed: { type: Number, default: 0 },
    carbsConsumed: { type: Number, default: 0 },
    proteinConsumed: { type: Number, default: 0 },
    fatConsumed: { type: Number, default: 0 },
    waterMlConsumed: { type: Number, default: 0 },
    stepsCompleted: { type: Number, default: 0 },
    exerciseMinutesCompleted: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    weightKg: Number,
  },
  { _id: false },
);

const dailyTargetsSnapshotSchema = new mongoose.Schema(
  { nutrition: nutritionTargetSchema, activity: activityTargetSchema },
  { _id: false },
);

const userDailyProgressSchema = new mongoose.Schema(
  {
    date: Date,
    dateKey: String,
    status: String,
    targets: dailyTargetsSnapshotSchema,
    actuals: dailyActualsSchema,
    adherenceScore: Number,
    notes: [String],
    completedAt: Date,
  },
  { _id: false },
);

const workoutSessionSchema = new mongoose.Schema(
  {
    date: Date,
    dateKey: String,
    dayNumber: Number,
    dayLabel: String,
    workoutTitle: String,
    plannedMinutes: Number,
    actualMinutes: Number,
    caloriesBurned: Number,
    startedAt: Date,
    completedAt: Date,
    notes: [String],
  },
  { _id: false },
);

const userProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    activePlan: userPlanSchema,
    planHistory: [userPlanSchema],
    dailyProgress: [userDailyProgressSchema],
    workoutSessions: [workoutSessionSchema],
    lastPlanGeneratedAt: Date,
    lastProgressUpdatedAt: Date,
  },
  { timestamps: true },
);

const UserProgress =
  mongoose.models["UserProgress"] ||
  mongoose.model("UserProgress", userProgressSchema);

// ─── Plan targets (from existing activePlan) ──────────────────────────────────

const PLAN_TARGETS = {
  nutrition: {
    calories: 2671,
    carbs: 321,
    protein: 200,
    fat: 65,
    waterMl: 2609,
  },
  activity: {
    steps: 6000,
    exerciseMinutes: 20,
    burnedCalories: 140,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Random integer between min and max (inclusive) */
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Random float rounded to 1 decimal */
const randFloat = (min: number, max: number): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(1));

/** Apply a ±variance% jitter to a target value */
const jitter = (target: number, variance: number): number =>
  Math.round(target * (1 + (Math.random() * 2 - 1) * variance));

/**
 * Calculate adherence score (mirrors server logic).
 * Each metric is capped at 1 (can't over-score by eating too much).
 */
function calcAdherence(
  targets: typeof PLAN_TARGETS,
  actuals: ReturnType<typeof buildActuals>,
): number {
  const checks: number[] = [];
  checks.push(
    Math.min(1, actuals.caloriesConsumed / targets.nutrition.calories),
  );
  checks.push(Math.min(1, actuals.carbsConsumed / targets.nutrition.carbs));
  checks.push(
    Math.min(1, actuals.proteinConsumed / targets.nutrition.protein),
  );
  checks.push(Math.min(1, actuals.fatConsumed / targets.nutrition.fat));
  checks.push(
    Math.min(1, actuals.waterMlConsumed / (targets.nutrition.waterMl ?? 1)),
  );
  checks.push(Math.min(1, actuals.stepsCompleted / targets.activity.steps));
  checks.push(
    Math.min(
      1,
      actuals.exerciseMinutesCompleted / targets.activity.exerciseMinutes,
    ),
  );
  const avg = checks.reduce((s, v) => s + v, 0) / checks.length;
  return Math.round(avg * 100);
}

function deriveStatus(
  score: number,
  actuals: ReturnType<typeof buildActuals>,
): string {
  const hasProgress = Object.values(actuals).some(
    (v) => typeof v === "number" && v > 0,
  );
  if (!hasProgress) return "not_started";
  if (score >= 100) return "completed";
  return "in_progress";
}

interface DayConfig {
  /** 0 = totally skipped day (no logging), 1 = perfect compliance */
  complianceFactor: number;
  /** Whether to log a workout session */
  hasWorkout: boolean;
  /** Weight check-in for this day (kg) */
  weightKg?: number;
  /** Optional notes */
  notes?: string[];
}

function buildActuals(cfg: DayConfig) {
  const f = cfg.complianceFactor;
  if (f === 0) {
    return {
      caloriesConsumed: 0,
      carbsConsumed: 0,
      proteinConsumed: 0,
      fatConsumed: 0,
      waterMlConsumed: 0,
      stepsCompleted: 0,
      exerciseMinutesCompleted: 0,
      caloriesBurned: 0,
      weightKg: cfg.weightKg,
    };
  }
  // Add natural day-to-day noise (±8%)
  const noise = 0.08;
  return {
    caloriesConsumed: jitter(
      Math.round(PLAN_TARGETS.nutrition.calories * f),
      noise,
    ),
    carbsConsumed: jitter(Math.round(PLAN_TARGETS.nutrition.carbs * f), noise),
    proteinConsumed: jitter(
      Math.round(PLAN_TARGETS.nutrition.protein * f),
      noise,
    ),
    fatConsumed: jitter(Math.round(PLAN_TARGETS.nutrition.fat * f), noise),
    waterMlConsumed: jitter(
      Math.round((PLAN_TARGETS.nutrition.waterMl ?? 2609) * f),
      noise,
    ),
    stepsCompleted: jitter(
      Math.round(PLAN_TARGETS.activity.steps * f),
      noise,
    ),
    exerciseMinutesCompleted: cfg.hasWorkout
      ? randInt(18, 45)
      : Math.round(PLAN_TARGETS.activity.exerciseMinutes * f * 0.4),
    caloriesBurned: cfg.hasWorkout
      ? randInt(180, 320)
      : jitter(Math.round(PLAN_TARGETS.activity.burnedCalories * f), noise),
    weightKg: cfg.weightKg,
  };
}

// ─── Workout library (vegetarian-friendly, muscle-build focus) ────────────────

const WORKOUTS = [
  {
    dayNumber: 1,
    dayLabel: "Monday",
    workoutTitle: "Upper Body Push – Chest & Shoulders",
    plannedMinutes: 40,
  },
  {
    dayNumber: 2,
    dayLabel: "Tuesday",
    workoutTitle: "Lower Body – Squats & Lunges",
    plannedMinutes: 35,
  },
  {
    dayNumber: 3,
    dayLabel: "Wednesday",
    workoutTitle: "Upper Body Pull – Back & Biceps",
    plannedMinutes: 40,
  },
  {
    dayNumber: 4,
    dayLabel: "Thursday",
    workoutTitle: "Active Recovery – Brisk Walk & Stretching",
    plannedMinutes: 25,
  },
  {
    dayNumber: 5,
    dayLabel: "Friday",
    workoutTitle: "Full Body Compound Lifts",
    plannedMinutes: 45,
  },
  {
    dayNumber: 6,
    dayLabel: "Saturday",
    workoutTitle: "Core & Mobility Circuit",
    plannedMinutes: 30,
  },
  {
    dayNumber: 7,
    dayLabel: "Sunday",
    workoutTitle: "Rest / Light Yoga",
    plannedMinutes: 20,
  },
];

// ─── 15-Day narrative config ──────────────────────────────────────────────────
// Today is Day 15 (May 10). Day 1 = April 26.

const DAY_CONFIGS: DayConfig[] = [
  // === WEEK 1: Getting started – inconsistent ===
  /* Day 1  (Apr 26) */ {
    complianceFactor: 0.55,
    hasWorkout: false,
    weightKg: 72.0,
    notes: ["Started tracking today. Forgot to log lunch properly."],
  },
  /* Day 2  (Apr 27) */ {
    complianceFactor: 0.72,
    hasWorkout: true,
    weightKg: 72.2,
    notes: ["First workout session – felt good but tired by the end."],
  },
  /* Day 3  (Apr 28) */ {
    complianceFactor: 0.0,
    hasWorkout: false,
    weightKg: undefined,
    notes: [], // Completely missed – no logging at all
  },
  /* Day 4  (Apr 29) */ {
    complianceFactor: 0.48,
    hasWorkout: false,
    weightKg: 72.4,
    notes: ["Busy day at work, only tracked dinner."],
  },
  /* Day 5  (Apr 30) */ {
    complianceFactor: 0.78,
    hasWorkout: true,
    weightKg: 72.3,
    notes: ["Leg day done. Protein shake after workout."],
  },
  /* Day 6  (May 1) */ {
    complianceFactor: 0.65,
    hasWorkout: false,
    weightKg: 72.5,
    notes: ["Holiday – ate out, estimates may be off."],
  },
  /* Day 7  (May 2) */ {
    complianceFactor: 0.6,
    hasWorkout: false,
    weightKg: 72.6,
    notes: ["Weekend. Hit water goal but missed step target."],
  },

  // === WEEK 2: Building consistency ===
  /* Day 8  (May 3) */ {
    complianceFactor: 0.82,
    hasWorkout: true,
    weightKg: 72.4,
    notes: ["Back on track. Pre-planned meals helped a lot."],
  },
  /* Day 9  (May 4) */ {
    complianceFactor: 0.75,
    hasWorkout: false,
    weightKg: 72.3,
    notes: ["Good day overall. Missed gym but walked 7k steps."],
  },
  /* Day 10 (May 5) */ {
    complianceFactor: 0.88,
    hasWorkout: true,
    weightKg: 72.1,
    notes: ["Hit protein target for first time! Pull day."],
  },
  /* Day 11 (May 6) */ {
    complianceFactor: 0.71,
    hasWorkout: false,
    weightKg: 72.0,
    notes: ["Average day. Skipped evening walk."],
  },
  /* Day 12 (May 7) */ {
    complianceFactor: 0.91,
    hasWorkout: true,
    weightKg: 71.9,
    notes: ["Full body session – felt strong. Great meal prep today."],
  },

  // === WEEK 3: On a roll – strong momentum ===
  /* Day 13 (May 8) */ {
    complianceFactor: 0.94,
    hasWorkout: true,
    weightKg: 71.8,
    notes: ["Core day. Hit all targets. Weight trending nicely."],
  },
  /* Day 14 (May 9) */ {
    complianceFactor: 0.97,
    hasWorkout: false,
    weightKg: 71.7,
    notes: [
      "Rest day. Nailed nutrition. 8k steps just from walking around.",
    ],
  },
  /* Day 15 (May 10) */ {
    complianceFactor: 1.0,
    hasWorkout: true,
    weightKg: 71.6,
    notes: ["Best day so far. Hit every target. Feeling great!"],
  },
];

// ─── Main seeder ──────────────────────────────────────────────────────────────

async function seed() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) throw new Error("MONGO_URI not set in .env");

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const USER_ID = "6a003f0071fb66ffa35cd2f3";
  const PROGRESS_ID = "6a003f5c71fb66ffa35cd2ff";

  const progress = await UserProgress.findById(PROGRESS_ID);
  if (!progress) {
    console.error("❌ UserProgress document not found!");
    await mongoose.disconnect();
    return;
  }

  console.log(`📋 Found UserProgress for user ${USER_ID}`);
  console.log(`📌 Active plan: v${progress.activePlan?.version} (${progress.activePlan?.source})`);

  // Build date range: today (May 10) is Day 15, Day 1 is April 26
  const TODAY = new Date("2026-05-10T18:00:00.000Z"); // ~11:30 PM IST
  const dailyProgress: typeof progress.dailyProgress = [];
  const workoutSessions: typeof progress.workoutSessions = [];

  for (let i = 0; i < 15; i++) {
    const dayOffset = i - 14; // Day 1 = -14 days ago, Day 15 = today
    const date = new Date(TODAY);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    date.setUTCHours(12, 0, 0, 0); // noon UTC

    const dateKey = toDateKey(date);
    const cfg = DAY_CONFIGS[i];
    const actuals = buildActuals(cfg);
    const adherenceScore = calcAdherence(PLAN_TARGETS, actuals);
    const status = cfg.complianceFactor === 0
      ? "missed"
      : deriveStatus(adherenceScore, actuals);

    const entry = {
      date,
      dateKey,
      status,
      targets: PLAN_TARGETS,
      actuals,
      adherenceScore,
      notes: cfg.notes?.length ? cfg.notes : undefined,
      completedAt: status === "completed" ? date : undefined,
    };

    dailyProgress.push(entry as any);
    console.log(
      `  📅 Day ${i + 1} (${dateKey}): compliance=${Math.round(cfg.complianceFactor * 100)}% | adherence=${adherenceScore} | status=${status}`,
    );

    // Add workout session for days that have one
    if (cfg.hasWorkout && cfg.complianceFactor > 0) {
      const workoutIndex = i % WORKOUTS.length;
      const w = WORKOUTS[workoutIndex];
      const workoutActualMins = Math.round(w.plannedMinutes * randFloat(0.8, 1.1));
      const caloriesBurned = Math.round(workoutActualMins * 5.5); // ~5.5 cal/min avg

      const startedAt = new Date(date);
      startedAt.setUTCHours(randInt(5, 8), randInt(0, 30), 0, 0); // morning session 5–8 AM UTC

      const completedAt = new Date(startedAt);
      completedAt.setUTCMinutes(completedAt.getUTCMinutes() + workoutActualMins);

      const session = {
        date,
        dateKey,
        dayNumber: w.dayNumber,
        dayLabel: w.dayLabel,
        workoutTitle: w.workoutTitle,
        plannedMinutes: w.plannedMinutes,
        actualMinutes: workoutActualMins,
        caloriesBurned,
        startedAt,
        completedAt,
        notes: cfg.notes?.length ? cfg.notes : [],
      };

      workoutSessions.push(session as any);
      console.log(
        `    💪 Workout: "${w.workoutTitle}" | ${workoutActualMins}min | ${caloriesBurned} cal burned`,
      );
    }
  }

  // Clear old progress arrays and populate with new seed data
  progress.dailyProgress = dailyProgress;
  progress.workoutSessions = workoutSessions;
  progress.lastProgressUpdatedAt = TODAY;

  await progress.save();

  console.log("\n✅ Seed complete!");
  console.log(`   📊 Daily progress entries: ${dailyProgress.length}`);
  console.log(`   💪 Workout sessions: ${workoutSessions.length}`);

  const missedCount = dailyProgress.filter((d: any) => d.status === "missed").length;
  const completedCount = dailyProgress.filter((d: any) => d.status === "completed").length;
  const inProgressCount = dailyProgress.filter((d: any) => d.status === "in_progress").length;

  console.log(
    `   📈 Status breakdown: ${completedCount} completed | ${inProgressCount} in_progress | ${missedCount} missed`,
  );

  const avgAdherence =
    dailyProgress
      .filter((d: any) => d.status !== "missed")
      .reduce((sum: number, d: any) => sum + d.adherenceScore, 0) /
    (dailyProgress.length - missedCount);
  console.log(`   📉 Avg adherence (non-missed days): ${avgAdherence.toFixed(1)}%`);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
