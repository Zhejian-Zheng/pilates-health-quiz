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
});
