import { describe, expect, it } from "vitest";

import {
  assertReadyToComplete,
  FunnelStateError,
  validateAnswerTransition,
} from "../src/lib/funnel-state";

describe("validateAnswerTransition", () => {
  it("allows the current step to be answered and advanced by one", () => {
    expect(() =>
      validateAnswerTransition(0, 1, [
        {
          stepKey: "ageRange",
          questionKey: "ageRange",
          value: "30-39",
        },
      ]),
    ).not.toThrow();
  });

  it("rejects skipped steps", () => {
    expect(() =>
      validateAnswerTransition(0, 2, [
        {
          stepKey: "ageRange",
          questionKey: "ageRange",
          value: "30-39",
        },
      ]),
    ).toThrow(FunnelStateError);
  });

  it("rejects answers for future steps", () => {
    expect(() =>
      validateAnswerTransition(0, 1, [
        {
          stepKey: "gender",
          questionKey: "gender",
          value: "female",
        },
      ]),
    ).toThrow(FunnelStateError);
  });

  it("rejects unknown question keys", () => {
    expect(() =>
      validateAnswerTransition(0, 1, [
        {
          stepKey: "unknown",
          questionKey: "unknown",
          value: "bad",
        },
      ]),
    ).toThrow(FunnelStateError);
  });
});

describe("assertReadyToComplete", () => {
  it("requires all health profile steps before completion", () => {
    expect(() =>
      assertReadyToComplete([
        { questionKey: "ageRange" },
        { questionKey: "gender" },
      ]),
    ).toThrow("Missing required funnel steps");
  });
});
