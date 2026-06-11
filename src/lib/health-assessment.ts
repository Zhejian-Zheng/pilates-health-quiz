export type Gender = "female" | "male" | "other";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type HealthProfileInput = {
  gender: Gender;
  goal: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
};

export type ProjectionPoint = {
  week: number;
  date: string;
  weightKg: number;
};

export type HealthAssessment = {
  bmi: number;
  bmiCategory: string;
  recommendedCalories: number;
  targetDate: Date;
  summary: string;
  detailedRecommendation: {
    dailyCalories: number;
    activityLevel: ActivityLevel;
    weeklyWeightChangeKg: number;
    planFocus: string[];
  };
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

export function assessHealth(
  profile: HealthProfileInput,
  now = new Date(),
): HealthAssessment {
  validateProfile(profile);

  const heightM = profile.heightCm / 100;
  const bmi = roundTo(profile.currentWeightKg / (heightM * heightM), 1);
  const bmiCategory = getBmiCategory(bmi);
  const bmr = calculateBmr(profile);
  const maintenanceCalories = bmr * ACTIVITY_FACTORS[profile.activityLevel];
  const weightDeltaKg = profile.targetWeightKg - profile.currentWeightKg;
  const direction = Math.sign(weightDeltaKg);
  const weeklyWeightChangeKg = getWeeklyWeightChangeKg(weightDeltaKg);
  const calorieAdjustment = direction === 0 ? 0 : direction * 450;
  const calorieFloor = profile.gender === "male" ? 1500 : 1200;
  const recommendedCalories = Math.round(
    Math.max(calorieFloor, maintenanceCalories + calorieAdjustment),
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

  return {
    bmi,
    bmiCategory,
    recommendedCalories,
    targetDate,
    summary: buildSummary(profile, bmi, bmiCategory, targetDate),
    detailedRecommendation: {
      dailyCalories: recommendedCalories,
      activityLevel: profile.activityLevel,
      weeklyWeightChangeKg: roundTo(weeklyWeightChangeKg, 2),
      planFocus: getPlanFocus(profile),
    },
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

  return focus;
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
