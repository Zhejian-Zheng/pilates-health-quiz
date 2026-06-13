import { describe, expect, it } from "vitest";

import {
  getDisplayedRemainingCount,
  getStepNavigatorItemStates,
} from "../src/lib/step-navigator-state";
import type { Question } from "../src/lib/quiz-types";

const sampleQuestions: Question[] = [
  makeSingleQuestion("ageRange"),
  makeSingleQuestion("gender"),
  makeSingleQuestion("goal"),
  makeSingleQuestion("activityLevel"),
];

describe("getDisplayedRemainingCount", () => {
  it("shows zero remaining questions after the result is ready", () => {
    expect(getDisplayedRemainingCount(8, true)).toBe(0);
  });

  it("shows the real remaining count while the quiz is still in progress", () => {
    expect(getDisplayedRemainingCount(3, false)).toBe(3);
  });
});

describe("getStepNavigatorItemStates", () => {
  it("marks every question as completed once the result is ready", () => {
    const states = getStepNavigatorItemStates({
      answers: {
        ageRange: "30-39",
        gender: "female",
      },
      currentStep: sampleQuestions.length,
      questions: sampleQuestions,
      reachableStep: 2,
      resultReady: true,
    });

    expect(states).toHaveLength(sampleQuestions.length);
    expect(states.every((state) => state.status === "completed")).toBe(true);
    expect(states.every((state) => state.isComplete)).toBe(true);
    expect(states.every((state) => !state.isCurrent)).toBe(true);
    expect(states.every((state) => state.isReachable)).toBe(true);
  });

  it("keeps current, answered, reachable, and upcoming states distinct in progress", () => {
    const states = getStepNavigatorItemStates({
      answers: {
        ageRange: "30-39",
      },
      currentStep: 1,
      questions: sampleQuestions,
      reachableStep: 2,
      resultReady: false,
    });

    expect(states.map((state) => state.status)).toEqual([
      "completed",
      "current",
      "unanswered",
      "upcoming",
    ]);
  });
});

function makeSingleQuestion(key: string): Question {
  return {
    key,
    title: {
      en: key,
      zh: key,
    },
    type: "single",
    options: [
      {
        label: {
          en: "Option",
          zh: "选项",
        },
        value: "option",
      },
    ],
  };
}
