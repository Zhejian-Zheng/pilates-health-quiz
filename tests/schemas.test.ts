import { describe, expect, it } from "vitest";

import {
  AnswerValueValidationError,
  paySchema,
  saveAnswersSchema,
  validateAnswerValues,
} from "../src/lib/schemas";

describe("validateAnswerValues", () => {
  it("accepts valid funnel answer values", () => {
    expect(() =>
      validateAnswerValues([
        { stepKey: "ageRange", questionKey: "ageRange", value: "30-39" },
        { stepKey: "gender", questionKey: "gender", value: "female" },
        { stepKey: "goal", questionKey: "goal", value: "Lose weight" },
        { stepKey: "activityLevel", questionKey: "activityLevel", value: "moderate" },
        { stepKey: "heightCm", questionKey: "heightCm", value: 165 },
        {
          stepKey: "currentWeightKg",
          questionKey: "currentWeightKg",
          value: 80,
        },
        { stepKey: "targetWeightKg", questionKey: "targetWeightKg", value: 70 },
        { stepKey: "age", questionKey: "age", value: 30 },
        { stepKey: "sleepQuality", questionKey: "sleepQuality", value: "poorSleep" },
        { stepKey: "sittingHours", questionKey: "sittingHours", value: "sittingHigh" },
        { stepKey: "bodyConcern", questionKey: "bodyConcern", value: "concernBack" },
        { stepKey: "equipment", questionKey: "equipment", value: "equipmentMat" },
        {
          stepKey: "pilatesExperience",
          questionKey: "pilatesExperience",
          value: "beginner",
        },
        { stepKey: "sessionTime", questionKey: "sessionTime", value: "timeShort" },
        { stepKey: "stressLevel", questionKey: "stressLevel", value: "stressHigh" },
        {
          stepKey: "movementLimitation",
          questionKey: "movementLimitation",
          value: "limitationKnee",
        },
        { stepKey: "equipment", questionKey: "equipment", value: "optionalUnsure" },
      ]),
    ).not.toThrow();
  });

  it.each([
    ["gender", "robot"],
    ["activityLevel", "twice per century"],
    ["heightCm", 17],
    ["currentWeightKg", 999],
    ["targetWeightKg", 12],
    ["age", 7],
    ["age", 30.5],
    ["sleepQuality", "always-awake"],
    ["sittingHours", "forever"],
    ["bodyConcern", "unknown"],
    ["equipment", "spaceship"],
    ["pilatesExperience", "expert-plus"],
    ["sessionTime", "all-day"],
    ["stressLevel", "volcano"],
    ["movementLimitation", "unknown"],
  ])("rejects invalid %s value", (questionKey, value) => {
    expect(() =>
      validateAnswerValues([{ stepKey: questionKey, questionKey, value }]),
    ).toThrow(AnswerValueValidationError);
  });

  it.each([
    ["heightCm", "165; DROP TABLE"],
    ["currentWeightKg", { kg: 80 }],
    ["targetWeightKg", [70]],
    ["age", "30"],
  ])("rejects non-numeric or injected %s values", (questionKey, value) => {
    expect(() =>
      validateAnswerValues([{ stepKey: questionKey, questionKey, value }]),
    ).toThrow(AnswerValueValidationError);
  });
});

describe("saveAnswersSchema", () => {
  const validAnswer = {
    stepKey: "ageRange",
    questionKey: "ageRange",
    value: "30-39",
  };

  it.each([
    ["empty answers", { answers: [] }],
    [
      "too many answers",
      {
        answers: Array.from({ length: 21 }, (_, index) => ({
          stepKey: `step-${index}`,
          questionKey: `step-${index}`,
          value: "ok",
        })),
      },
    ],
    [
      "blank step key",
      {
        answers: [
          {
            ...validAnswer,
            stepKey: " ",
          },
        ],
      },
    ],
    [
      "negative current step",
      {
        currentStep: -1,
        answers: [validAnswer],
      },
    ],
    [
      "non-finite JSON number",
      {
        answers: [
          {
            ...validAnswer,
            value: Number.NaN,
          },
        ],
      },
    ],
  ])("rejects malformed payloads: %s", (_label, payload) => {
    expect(() => saveAnswersSchema.parse(payload)).toThrow();
  });
});

describe("paySchema", () => {
  it("allows cookie-backed payment payloads without a body sessionId", () => {
    const parsed = paySchema.parse({
      payload: {
        source: "button",
      },
    });

    expect(parsed.sessionId).toBeUndefined();
    expect(parsed.eventType).toBe("PAYMENT_SUCCEEDED");
    expect(parsed.payload).toEqual({
      source: "button",
    });
  });

  it.each([
    ["sessionId", { sessionId: " " }],
    ["providerEventId", { providerEventId: " " }],
    ["eventType", { eventType: " " }],
  ])("rejects blank optional payment field %s", (_label, payload) => {
    expect(() => paySchema.parse(payload)).toThrow();
  });
});
