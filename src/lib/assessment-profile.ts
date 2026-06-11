import {
  type ActivityLevel,
  type Gender,
  type HealthProfileInput,
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
