import { z } from "zod";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

const jsonValueSchema = z.custom<JsonValue>(isJsonValue, {
  message: "Value must be valid JSON data",
});

const answerSchema = z.object({
  stepKey: z.string().trim().min(1).max(80),
  questionKey: z.string().trim().min(1).max(80),
  value: jsonValueSchema,
});

export const createSessionSchema = z.object({
  flowId: z.string().trim().min(1).max(80).default("2117"),
});

export const saveAnswersSchema = z.object({
  currentStep: z.number().int().min(0).max(200).optional(),
  answers: z.array(answerSchema).min(1).max(20),
});

export function validateAnswerValues(answers: z.infer<typeof saveAnswersSchema>["answers"]) {
  for (const answer of answers) {
    const value = answer.value;

    switch (answer.questionKey) {
      case "ageRange":
        if (!["18-29", "30-39", "40-49", "50+"].includes(String(value))) {
          throw new AnswerValueValidationError("ageRange must be one of the supported ranges");
        }
        break;
      case "gender":
        if (!["female", "male", "other"].includes(String(value))) {
          throw new AnswerValueValidationError("gender must be female, male, or other");
        }
        break;
      case "goal":
        if (
          ![
            "Lose weight",
            "Increase muscle strength",
            "Develop flexibility",
            "Improve posture",
          ].includes(String(value))
        ) {
          throw new AnswerValueValidationError("goal is not supported");
        }
        break;
      case "activityLevel":
        if (!["sedentary", "light", "moderate", "active"].includes(String(value))) {
          throw new AnswerValueValidationError("activityLevel is not supported");
        }
        break;
      case "heightCm":
        assertNumberInRange(value, "heightCm", 100, 250);
        break;
      case "currentWeightKg":
      case "targetWeightKg":
        assertNumberInRange(value, answer.questionKey, 30, 300);
        break;
      case "age":
        assertIntegerInRange(value, "age", 13, 100);
        break;
      default:
        break;
    }
  }
}

export class AnswerValueValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnswerValueValidationError";
  }
}

function assertNumberInRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new AnswerValueValidationError(
      `${fieldName} must be a number between ${min} and ${max}`,
    );
  }
}

function assertIntegerInRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new AnswerValueValidationError(
      `${fieldName} must be an integer between ${min} and ${max}`,
    );
  }
}

export const paySchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  providerEventId: z.string().trim().min(1).max(160).optional(),
  eventType: z.string().trim().min(1).max(80).default("PAYMENT_SUCCEEDED"),
  payload: jsonValueSchema.default({}),
});
