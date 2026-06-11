import { describe, expect, it } from "vitest";

import {
  assessHealth,
  getBmiCategory,
  HealthAssessmentError,
  type HealthProfileInput,
} from "../src/lib/health-assessment";

const baseProfile: HealthProfileInput = {
  gender: "female",
  goal: "Lose weight",
  age: 30,
  heightCm: 165,
  currentWeightKg: 80,
  targetWeightKg: 70,
  activityLevel: "moderate",
};

describe("assessHealth", () => {
  it("calculates BMI, calories, and projection curve for a weight-loss plan", () => {
    const result = assessHealth(
      baseProfile,
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(result.bmi).toBe(29.4);
    expect(result.bmiCategory).toBe("OVERWEIGHT");
    expect(result.bmr).toBe(1520);
    expect(result.tdee).toBe(2356);
    expect(result.recommendedCalories).toBeGreaterThanOrEqual(1200);
    expect(result.recommendedCalories).toBeLessThan(2200);
    expect(result.detailedRecommendation.weeklyWeightChangeKg).toBe(-0.5);
    expect(result.detailedRecommendation.report.scenarios).toHaveLength(5);
    expect(result.detailedRecommendation.report.scenarios[0]).toMatchObject({
      activityLevel: "sedentary",
      activityFactor: 1.2,
      tdee: 1824,
      mildDeficitCalories: 300,
      standardDeficitCalories: 304,
      mildWeeksToTarget: 37,
      standardWeeksToTarget: 37,
    });
    expect(result.detailedRecommendation.report.scenarios[2]).toMatchObject({
      activityLevel: "moderate",
      tdee: 2356,
      mildWeeksToTarget: 37,
      standardWeeksToTarget: 22,
    });
    expect(result.projectionCurve).toHaveLength(21);
    expect(result.projectionCurve[0]).toMatchObject({
      week: 0,
      weightKg: 80,
    });
    expect(result.projectionCurve.at(-1)).toMatchObject({
      week: 20,
      weightKg: 70,
    });
  });

  it("supports a steady weight-gain goal", () => {
    const result = assessHealth({
      ...baseProfile,
      goal: "Increase muscle strength",
      currentWeightKg: 62,
      targetWeightKg: 66,
      activityLevel: "active",
    });

    expect(result.detailedRecommendation.weeklyWeightChangeKg).toBe(0.5);
    expect(result.recommendedCalories).toBeGreaterThan(1800);
    expect(result.detailedRecommendation.planFocus).toContain(
      "strength progression",
    );
  });

  it.each([
    ["age", { age: 8 }],
    ["height", { heightCm: 80 }],
    ["current weight", { currentWeightKg: 20 }],
    ["target weight", { targetWeightKg: 20 }],
    ["unreasonable target", { targetWeightKg: 40 }],
  ])("rejects invalid %s input", (_label, override) => {
    expect(() =>
      assessHealth({
        ...baseProfile,
        ...override,
      }),
    ).toThrow(HealthAssessmentError);
  });
});

describe("getBmiCategory", () => {
  it.each([
    [18.4, "UNDERWEIGHT"],
    [18.5, "HEALTHY"],
    [24.9, "HEALTHY"],
    [25, "OVERWEIGHT"],
    [30, "OBESE"],
  ])("classifies BMI %s as %s", (bmi, category) => {
    expect(getBmiCategory(bmi)).toBe(category);
  });
});
