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
