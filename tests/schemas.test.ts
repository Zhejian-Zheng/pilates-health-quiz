import { describe, expect, it } from "vitest";

import {
  AnswerValueValidationError,
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
  ])("rejects invalid %s value", (questionKey, value) => {
    expect(() =>
      validateAnswerValues([{ stepKey: questionKey, questionKey, value }]),
    ).toThrow(AnswerValueValidationError);
  });
});
