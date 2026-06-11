export type Gender = "female" | "male" | "other";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type SleepQuality = "poorSleep" | "fairSleep" | "goodSleep";
export type SittingHours = "sittingLow" | "sittingMedium" | "sittingHigh";
export type BodyConcern =
  | "concernPosture"
  | "concernBack"
  | "concernCore"
  | "concernFlexibility";
export type EquipmentAccess =
  | "equipmentMat"
  | "equipmentProps"
  | "equipmentReformer";
export type PilatesExperience = "beginner" | "returning" | "experienced";
export type SessionTime = "timeShort" | "timeMedium" | "timeLong";
export type StressLevel = "stressLow" | "stressMedium" | "stressHigh";
export type MovementLimitation =
  | "limitationNone"
  | "limitationKnee"
  | "limitationBack"
  | "limitationShoulder";

export type HealthProfileInput = {
  gender: Gender;
  goal: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  sleepQuality?: SleepQuality;
  sittingHours?: SittingHours;
  bodyConcern?: BodyConcern;
  equipment?: EquipmentAccess;
  pilatesExperience?: PilatesExperience;
  sessionTime?: SessionTime;
  stressLevel?: StressLevel;
  movementLimitation?: MovementLimitation;
};

export type ProjectionPoint = {
  week: number;
  date: string;
  weightKg: number;
};

export type FatLossScenario = {
  activityLevel: ActivityLevel;
  activityLabel: string;
  activityFactor: number;
  tdee: number;
  mildDeficitCalories: number;
  standardDeficitCalories: number;
  mildDailyCalories: number;
  standardDailyCalories: number;
  mildWeeksToTarget: number | null;
  standardWeeksToTarget: number | null;
  mildTargetDate: string | null;
  standardTargetDate: string | null;
};

export type HealthReport = {
  formula: string;
  bmr: number;
  selectedActivityLevel: ActivityLevel;
  selectedActivityFactor: number;
  selectedTdee: number;
  targetWeightDeltaKg: number;
  fatLossCaloriesPerKg: number;
  scenarios: FatLossScenario[];
  notes: string[];
};

export type HealthAssessment = {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  recommendedCalories: number;
  targetDate: Date;
  summary: string;
  detailedRecommendation: {
    bmr: number;
    tdee: number;
    dailyCalories: number;
    activityLevel: ActivityLevel;
    weeklyWeightChangeKg: number;
    planFocus: string[];
    report: HealthReport;
  };
  report: HealthReport;
  projectionCurve: ProjectionPoint[];
};

export class HealthAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HealthAssessmentError";
  }
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Light activity",
  moderate: "Moderate activity",
  active: "High activity",
  very_active: "Very high activity",
};

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];

const FAT_LOSS_CALORIES_PER_KG = 7700;
const MILD_DEFICIT = 300;
const STANDARD_DEFICIT = 500;

export function assessHealth(
  profile: HealthProfileInput,
  now = new Date(),
): HealthAssessment {
  validateProfile(profile);

  const heightM = profile.heightCm / 100;
  const bmi = roundTo(profile.currentWeightKg / (heightM * heightM), 1);
  const bmiCategory = getBmiCategory(bmi);
  const bmr = calculateBmr(profile);
  const selectedActivityFactor = ACTIVITY_FACTORS[profile.activityLevel];
  const maintenanceCalories = bmr * selectedActivityFactor;
  const weightDeltaKg = profile.targetWeightKg - profile.currentWeightKg;
  const direction = Math.sign(weightDeltaKg);
  const weeklyWeightChangeKg = getWeeklyWeightChangeKg(weightDeltaKg);
  const calorieAdjustment =
    direction === 0 ? 0 : direction < 0 ? -STANDARD_DEFICIT : 250;
  const recommendedCalories = Math.round(
    direction < 0
      ? Math.max(bmr, maintenanceCalories + calorieAdjustment)
      : maintenanceCalories + calorieAdjustment,
  );
  const weeksToTarget =
    weeklyWeightChangeKg === 0
      ? 0
      : Math.ceil(Math.abs(weightDeltaKg) / Math.abs(weeklyWeightChangeKg));
  const targetDate = addDays(now, weeksToTarget * 7);
  const projectionCurve = buildProjectionCurve(
    profile.currentWeightKg,
    profile.targetWeightKg,
    weeklyWeightChangeKg,
    now,
  );
  const report = buildHealthReport(profile, bmr, now);

  return {
    bmi,
    bmiCategory,
    bmr: Math.round(bmr),
    tdee: Math.round(maintenanceCalories),
    recommendedCalories,
    targetDate,
    summary: buildSummary(profile, bmi, bmiCategory, targetDate),
    detailedRecommendation: {
      bmr: Math.round(bmr),
      tdee: Math.round(maintenanceCalories),
      dailyCalories: recommendedCalories,
      activityLevel: profile.activityLevel,
      weeklyWeightChangeKg: roundTo(weeklyWeightChangeKg, 2),
      planFocus: getPlanFocus(profile),
      report,
    },
    report,
    projectionCurve,
  };
}

export function getBmiCategory(bmi: number) {
  if (bmi < 18.5) {
    return "UNDERWEIGHT";
  }

  if (bmi < 25) {
    return "HEALTHY";
  }

  if (bmi < 30) {
    return "OVERWEIGHT";
  }

  return "OBESE";
}

function validateProfile(profile: HealthProfileInput) {
  if (!["female", "male", "other"].includes(profile.gender)) {
    throw new HealthAssessmentError("Gender must be female, male, or other");
  }

  if (!Number.isInteger(profile.age) || profile.age < 13 || profile.age > 100) {
    throw new HealthAssessmentError("Age must be an integer between 13 and 100");
  }

  if (profile.heightCm < 100 || profile.heightCm > 250) {
    throw new HealthAssessmentError("Height must be between 100cm and 250cm");
  }

  if (profile.currentWeightKg < 30 || profile.currentWeightKg > 300) {
    throw new HealthAssessmentError(
      "Current weight must be between 30kg and 300kg",
    );
  }

  if (profile.targetWeightKg < 30 || profile.targetWeightKg > 300) {
    throw new HealthAssessmentError(
      "Target weight must be between 30kg and 300kg",
    );
  }

  const ratio = profile.targetWeightKg / profile.currentWeightKg;

  if (ratio < 0.55 || ratio > 1.45) {
    throw new HealthAssessmentError(
      "Target weight is too far from current weight for this plan",
    );
  }
}

function calculateBmr(profile: HealthProfileInput) {
  const base =
    10 * profile.currentWeightKg + 6.25 * profile.heightCm - 5 * profile.age;

  if (profile.gender === "male") {
    return base + 5;
  }

  if (profile.gender === "female") {
    return base - 161;
  }

  return base - 78;
}

function buildHealthReport(
  profile: HealthProfileInput,
  bmr: number,
  now: Date,
): HealthReport {
  const targetWeightDeltaKg = roundTo(
    profile.targetWeightKg - profile.currentWeightKg,
    1,
  );
  const weightToLoseKg = Math.max(
    0,
    profile.currentWeightKg - profile.targetWeightKg,
  );

  return {
    formula: "Mifflin-St Jeor",
    bmr: Math.round(bmr),
    selectedActivityLevel: profile.activityLevel,
    selectedActivityFactor: ACTIVITY_FACTORS[profile.activityLevel],
    selectedTdee: Math.round(bmr * ACTIVITY_FACTORS[profile.activityLevel]),
    targetWeightDeltaKg,
    fatLossCaloriesPerKg: FAT_LOSS_CALORIES_PER_KG,
    scenarios: ACTIVITY_LEVELS.map((activityLevel) =>
      buildFatLossScenario(activityLevel, bmr, weightToLoseKg, now),
    ),
    notes: [
      "BMR uses the Mifflin-St Jeor formula.",
      "TDEE equals BMR multiplied by the activity factor.",
      "Fat-loss plans estimate 1kg body-weight reduction as roughly 7700 kcal.",
      "A mild cut uses a 300 kcal/day deficit; a standard cut uses a 500 kcal/day deficit.",
      "Daily calories are not set below BMR.",
      ...getOptionalContextNotes(profile),
    ],
  };
}

function buildFatLossScenario(
  activityLevel: ActivityLevel,
  bmr: number,
  weightToLoseKg: number,
  now: Date,
): FatLossScenario {
  const activityFactor = ACTIVITY_FACTORS[activityLevel];
  const tdee = Math.round(bmr * activityFactor);
  const mildDailyCalories = Math.round(Math.max(bmr, tdee - MILD_DEFICIT));
  const standardDailyCalories = Math.round(Math.max(bmr, tdee - STANDARD_DEFICIT));
  const mildDeficitCalories = Math.max(0, tdee - mildDailyCalories);
  const standardDeficitCalories = Math.max(0, tdee - standardDailyCalories);
  const mildWeeksToTarget = calculateWeeksToTarget(
    weightToLoseKg,
    mildDeficitCalories,
  );
  const standardWeeksToTarget = calculateWeeksToTarget(
    weightToLoseKg,
    standardDeficitCalories,
  );

  return {
    activityLevel,
    activityLabel: ACTIVITY_LABELS[activityLevel],
    activityFactor,
    tdee,
    mildDeficitCalories,
    standardDeficitCalories,
    mildDailyCalories,
    standardDailyCalories,
    mildWeeksToTarget,
    standardWeeksToTarget,
    mildTargetDate:
      mildWeeksToTarget === null
        ? null
        : toDateOnly(addDays(now, mildWeeksToTarget * 7)),
    standardTargetDate:
      standardWeeksToTarget === null
        ? null
        : toDateOnly(addDays(now, standardWeeksToTarget * 7)),
  };
}

function calculateWeeksToTarget(weightToLoseKg: number, dailyDeficit: number) {
  if (weightToLoseKg <= 0) {
    return 0;
  }

  if (dailyDeficit <= 0) {
    return null;
  }

  return Math.ceil(
    (weightToLoseKg * FAT_LOSS_CALORIES_PER_KG) / (dailyDeficit * 7),
  );
}

function getWeeklyWeightChangeKg(weightDeltaKg: number) {
  if (weightDeltaKg === 0) {
    return 0;
  }

  const direction = Math.sign(weightDeltaKg);
  const absDelta = Math.abs(weightDeltaKg);

  if (absDelta <= 3) {
    return direction * 0.25;
  }

  if (absDelta <= 10) {
    return direction * 0.5;
  }

  return direction * 0.75;
}

function buildProjectionCurve(
  currentWeightKg: number,
  targetWeightKg: number,
  weeklyWeightChangeKg: number,
  now: Date,
) {
  if (weeklyWeightChangeKg === 0) {
    return [
      {
        week: 0,
        date: toDateOnly(now),
        weightKg: roundTo(currentWeightKg, 1),
      },
    ];
  }

  const direction = Math.sign(weeklyWeightChangeKg);
  const weeks = Math.ceil(
    Math.abs(targetWeightKg - currentWeightKg) /
      Math.abs(weeklyWeightChangeKg),
  );

  return Array.from({ length: weeks + 1 }, (_, week) => {
    const rawWeight = currentWeightKg + weeklyWeightChangeKg * week;
    const weightKg =
      direction > 0
        ? Math.min(rawWeight, targetWeightKg)
        : Math.max(rawWeight, targetWeightKg);

    return {
      week,
      date: toDateOnly(addDays(now, week * 7)),
      weightKg: roundTo(weightKg, 1),
    };
  });
}

function buildSummary(
  profile: HealthProfileInput,
  bmi: number,
  bmiCategory: string,
  targetDate: Date,
) {
  const goalText =
    profile.targetWeightKg < profile.currentWeightKg
      ? "lose weight"
      : profile.targetWeightKg > profile.currentWeightKg
        ? "gain strength and weight steadily"
        : "maintain your current weight";

  return `Your BMI is ${bmi} (${bmiCategory}). Based on your ${profile.activityLevel} activity level, this plan is calibrated to help you ${goalText} by ${toDateOnly(targetDate)}.`;
}

function getPlanFocus(profile: HealthProfileInput) {
  const focus = ["beginner-friendly Pilates", "consistent weekly movement"];
  const goal = profile.goal.toLowerCase();

  if (goal.includes("weight") || profile.targetWeightKg < profile.currentWeightKg) {
    focus.push("sustainable calorie deficit");
  }

  if (goal.includes("strength") || profile.targetWeightKg > profile.currentWeightKg) {
    focus.push("strength progression");
  }

  if (profile.sleepQuality === "poorSleep") {
    focus.push("recovery-first pacing");
  }

  if (profile.sleepQuality === "fairSleep") {
    focus.push("balanced recovery days");
  }

  if (profile.sittingHours === "sittingHigh") {
    focus.push("desk-posture mobility breaks");
  }

  if (profile.bodyConcern === "concernPosture") {
    focus.push("posture alignment");
  }

  if (profile.bodyConcern === "concernBack") {
    focus.push("back-friendly core stability");
  }

  if (profile.bodyConcern === "concernCore") {
    focus.push("core control");
  }

  if (profile.bodyConcern === "concernFlexibility") {
    focus.push("mobility and flexibility");
  }

  if (profile.equipment === "equipmentMat") {
    focus.push("mat-only sessions");
  }

  if (profile.equipment === "equipmentProps") {
    focus.push("small-prop progressions");
  }

  if (profile.equipment === "equipmentReformer") {
    focus.push("reformer-compatible options");
  }

  if (profile.pilatesExperience === "beginner") {
    focus.push("foundational technique cues");
  }

  if (profile.pilatesExperience === "returning") {
    focus.push("gradual comeback progression");
  }

  if (profile.pilatesExperience === "experienced") {
    focus.push("more precise progression options");
  }

  if (profile.sessionTime === "timeShort") {
    focus.push("short-session programming");
  }

  if (profile.sessionTime === "timeLong") {
    focus.push("longer flow sessions");
  }

  if (profile.stressLevel === "stressHigh") {
    focus.push("stress-aware recovery work");
  }

  if (profile.movementLimitation === "limitationKnee") {
    focus.push("knee-friendly low-impact options");
  }

  if (profile.movementLimitation === "limitationBack") {
    focus.push("back-sensitive movement choices");
  }

  if (profile.movementLimitation === "limitationShoulder") {
    focus.push("shoulder-friendly upper-body options");
  }

  return focus;
}

function getOptionalContextNotes(profile: HealthProfileInput) {
  const notes: string[] = [];

  if (profile.sleepQuality) {
    notes.push(`Recovery pacing is adjusted for sleep context: ${profile.sleepQuality}.`);
  }

  if (profile.sittingHours) {
    notes.push(`Mobility emphasis considers daily sitting time: ${profile.sittingHours}.`);
  }

  if (profile.bodyConcern) {
    notes.push(`Training focus includes the user's selected concern: ${profile.bodyConcern}.`);
  }

  if (profile.equipment) {
    notes.push(`Exercise selection considers available equipment: ${profile.equipment}.`);
  }

  if (profile.pilatesExperience) {
    notes.push(`Exercise progression considers Pilates experience: ${profile.pilatesExperience}.`);
  }

  if (profile.sessionTime) {
    notes.push(`Session length is adjusted for available time: ${profile.sessionTime}.`);
  }

  if (profile.stressLevel) {
    notes.push(`Intensity balance considers current stress level: ${profile.stressLevel}.`);
  }

  if (profile.movementLimitation && profile.movementLimitation !== "limitationNone") {
    notes.push(
      `Low-impact alternatives consider movement limitation: ${profile.movementLimitation}.`,
    );
  }

  return notes;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function roundTo(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
