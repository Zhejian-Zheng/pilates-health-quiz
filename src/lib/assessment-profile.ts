import {
  type ActivityLevel,
  type BodyConcern,
  type EquipmentAccess,
  type Gender,
  type HealthProfileInput,
  type MovementLimitation,
  type PilatesExperience,
  type SittingHours,
  type SleepQuality,
  type SessionTime,
  type StressLevel,
} from "@/lib/health-assessment";

type AnswerLike = {
  stepKey: string;
  questionKey: string;
  value: unknown;
};

const FIELD_ALIASES = {
  gender: ["gender"],
  goal: ["goal", "goalType", "mainGoal"],
  age: ["age"],
  heightCm: ["heightCm", "height"],
  currentWeightKg: ["currentWeightKg", "currentWeight", "weight"],
  targetWeightKg: ["targetWeightKg", "targetWeight", "goalWeight"],
  activityLevel: ["activityLevel", "fitnessLevel", "activities", "exerciseFrequency"],
  sleepQuality: ["sleepQuality"],
  sittingHours: ["sittingHours"],
  bodyConcern: ["bodyConcern"],
  equipment: ["equipment"],
  pilatesExperience: ["pilatesExperience"],
  sessionTime: ["sessionTime"],
  stressLevel: ["stressLevel"],
  movementLimitation: ["movementLimitation"],
};

export class AssessmentProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentProfileError";
  }
}

export function extractHealthProfile(
  answers: AnswerLike[],
): HealthProfileInput {
  const answerMap = new Map<string, unknown>();

  for (const answer of answers) {
    answerMap.set(answer.questionKey, answer.value);
    answerMap.set(answer.stepKey, answer.value);
  }

  return {
    gender: normalizeGender(readRequired(answerMap, FIELD_ALIASES.gender)),
    goal: normalizeString(readRequired(answerMap, FIELD_ALIASES.goal), "goal"),
    age: normalizeInteger(readRequired(answerMap, FIELD_ALIASES.age), "age"),
    heightCm: normalizeNumber(
      readRequired(answerMap, FIELD_ALIASES.heightCm),
      "heightCm",
    ),
    currentWeightKg: normalizeNumber(
      readRequired(answerMap, FIELD_ALIASES.currentWeightKg),
      "currentWeightKg",
    ),
    targetWeightKg: normalizeNumber(
      readRequired(answerMap, FIELD_ALIASES.targetWeightKg),
      "targetWeightKg",
    ),
    activityLevel: normalizeActivityLevel(
      readRequired(answerMap, FIELD_ALIASES.activityLevel),
    ),
    sleepQuality: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.sleepQuality),
      ["poorSleep", "fairSleep", "goodSleep"],
    ) as SleepQuality | undefined,
    sittingHours: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.sittingHours),
      ["sittingLow", "sittingMedium", "sittingHigh"],
    ) as SittingHours | undefined,
    bodyConcern: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.bodyConcern),
      ["concernPosture", "concernBack", "concernCore", "concernFlexibility"],
    ) as BodyConcern | undefined,
    equipment: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.equipment),
      ["equipmentMat", "equipmentProps", "equipmentReformer"],
    ) as EquipmentAccess | undefined,
    pilatesExperience: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.pilatesExperience),
      ["beginner", "returning", "experienced"],
    ) as PilatesExperience | undefined,
    sessionTime: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.sessionTime),
      ["timeShort", "timeMedium", "timeLong"],
    ) as SessionTime | undefined,
    stressLevel: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.stressLevel),
      ["stressLow", "stressMedium", "stressHigh"],
    ) as StressLevel | undefined,
    movementLimitation: normalizeOptionalEnum(
      readOptional(answerMap, FIELD_ALIASES.movementLimitation),
      [
        "limitationNone",
        "limitationKnee",
        "limitationBack",
        "limitationShoulder",
      ],
    ) as MovementLimitation | undefined,
  };
}

function readRequired(answerMap: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (answerMap.has(key)) {
      return answerMap.get(key);
    }
  }

  throw new AssessmentProfileError(`Missing required answer: ${keys[0]}`);
}

function readOptional(answerMap: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (answerMap.has(key)) {
      return answerMap.get(key);
    }
  }

  return undefined;
}

function normalizeString(value: unknown, fieldName: string) {
  const scalar = unwrapAnswerValue(value);

  if (typeof scalar !== "string" || scalar.trim() === "") {
    throw new AssessmentProfileError(`${fieldName} must be a non-empty string`);
  }

  return scalar.trim();
}

function normalizeGender(value: unknown): Gender {
  const gender = normalizeString(value, "gender").toLowerCase();

  if (gender === "female" || gender === "woman") {
    return "female";
  }

  if (gender === "male" || gender === "man") {
    return "male";
  }

  return "other";
}

function normalizeInteger(value: unknown, fieldName: string) {
  const numberValue = normalizeNumber(value, fieldName);

  if (!Number.isInteger(numberValue)) {
    throw new AssessmentProfileError(`${fieldName} must be an integer`);
  }

  return numberValue;
}

function normalizeNumber(value: unknown, fieldName: string) {
  const scalar = unwrapAnswerValue(value);
  const numberValue =
    typeof scalar === "number" ? scalar : Number.parseFloat(String(scalar));

  if (!Number.isFinite(numberValue)) {
    throw new AssessmentProfileError(`${fieldName} must be a valid number`);
  }

  return numberValue;
}

function normalizeActivityLevel(value: unknown): ActivityLevel {
  const scalar = unwrapAnswerValue(value);

  if (typeof scalar === "number") {
    if (scalar <= 0) {
      return "sedentary";
    }

    if (scalar <= 0.5) {
      return "light";
    }

    if (scalar <= 1) {
      return "moderate";
    }

    return "active";
  }

  const activity = String(scalar).trim().toLowerCase();

  if (["sedentary", "never", "none", "0"].includes(activity)) {
    return "sedentary";
  }

  if (
    activity.includes("month") ||
    activity.includes("light") ||
    activity === "1"
  ) {
    return "light";
  }

  if (
    activity.includes("week") ||
    activity.includes("moderate") ||
    activity === "2"
  ) {
    return "moderate";
  }

  if (activity.includes("day") || activity.includes("active")) {
    return "active";
  }

  if (activity.includes("athlete") || activity.includes("very")) {
    return "very_active";
  }

  return "moderate";
}

function normalizeOptionalEnum(value: unknown, allowedValues: string[]) {
  if (value === undefined) {
    return undefined;
  }

  const scalar = unwrapAnswerValue(value);

  if (scalar === "optionalUnsure") {
    return undefined;
  }

  if (typeof scalar !== "string" || !allowedValues.includes(scalar)) {
    throw new AssessmentProfileError(
      `Optional answer must be one of: ${[...allowedValues, "optionalUnsure"].join(", ")}`,
    );
  }

  return scalar;
}

function unwrapAnswerValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return record.value ?? record.contentValue ?? record.label ?? record.title;
  }

  return value;
}
