import { describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const healthAnswers = [
  { stepKey: "gender", questionKey: "gender", value: "female" },
  { stepKey: "goal", questionKey: "goal", value: "Lose weight" },
  { stepKey: "activityLevel", questionKey: "activityLevel", value: "moderate" },
  { stepKey: "heightCm", questionKey: "heightCm", value: 165 },
  { stepKey: "currentWeightKg", questionKey: "currentWeightKg", value: 80 },
  { stepKey: "targetWeightKg", questionKey: "targetWeightKg", value: 70 },
  { stepKey: "age", questionKey: "age", value: 30 },
];

describe.runIf(hasDatabase).sequential("assessment API flow", () => {
  it(
    "persists answers, gates unpaid results, and unlocks full results after payment",
    async () => {
      const { POST: createSession } = await import(
        "../src/app/api/sessions/route"
      );
      const { PATCH: saveAnswers } = await import(
        "../src/app/api/sessions/[sessionId]/answers/route"
      );
      const { POST: completeAssessment } = await import(
        "../src/app/api/sessions/[sessionId]/complete/route"
      );
      const { GET: getResult } = await import(
        "../src/app/api/results/[sessionId]/route"
      );
      const { POST: pay } = await import("../src/app/api/pay/route");

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      expect(createdResponse.status).toBe(201);
      expect(created.status).toBe("IN_PROGRESS");

      const savedResponse = await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 31,
            answers: healthAnswers,
          },
          "PATCH",
        ),
        context,
      );
      const saved = await savedResponse.json();

      expect(savedResponse.status).toBe(200);
      expect(saved.answers).toHaveLength(7);

      const completedResponse = await completeAssessment(
        new Request(
          `http://test.local/api/sessions/${created.sessionId}/complete`,
          { method: "POST" },
        ),
        context,
      );
      const completed = await completedResponse.json();

      expect(completedResponse.status).toBe(200);
      expect(completed.status).toBe("COMPLETED");

      const lockedResponse = await getResult(
        new Request(`http://test.local/api/results/${created.sessionId}`),
        context,
      );
      const locked = await lockedResponse.json();

      expect(lockedResponse.status).toBe(200);
      expect(locked.access).toBe("LOCKED");
      expect(locked.result.bmi).toBe(29.4);
      expect(locked.result.projectionCurve).toBeUndefined();
      expect(locked.result.detailedRecommendation).toBeUndefined();
      expect(locked.result.paywall.protectedFields).toContain(
        "projectionCurve",
      );

      const paidResponse = await pay(
        jsonRequest(
          "http://test.local/api/pay",
          {
            sessionId: created.sessionId,
            payload: { test: true },
          },
          "POST",
        ),
      );
      const paid = await paidResponse.json();

      expect(paidResponse.status).toBe(200);
      expect(paid.subscriptionStatus).toBe("ACTIVE");

      const fullResponse = await getResult(
        new Request(`http://test.local/api/results/${created.sessionId}`),
        context,
      );
      const full = await fullResponse.json();

      expect(fullResponse.status).toBe(200);
      expect(full.access).toBe("FULL");
      expect(full.result.recommendedCalories).toBeGreaterThan(0);
      expect(full.result.projectionCurve.length).toBeGreaterThan(1);
      expect(full.result.paywall).toBeUndefined();
    },
    60_000,
  );

  it(
    "rejects completion when required health answers are missing",
    async () => {
      const { POST: createSession } = await import(
        "../src/app/api/sessions/route"
      );
      const { PATCH: saveAnswers } = await import(
        "../src/app/api/sessions/[sessionId]/answers/route"
      );
      const { POST: completeAssessment } = await import(
        "../src/app/api/sessions/[sessionId]/complete/route"
      );

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 2,
            answers: [
              { stepKey: "gender", questionKey: "gender", value: "female" },
            ],
          },
          "PATCH",
        ),
        context,
      );

      const completedResponse = await completeAssessment(
        new Request(
          `http://test.local/api/sessions/${created.sessionId}/complete`,
          { method: "POST" },
        ),
        context,
      );
      const completed = await completedResponse.json();

      expect(completedResponse.status).toBe(422);
      expect(completed.error.message).toContain("Missing required answer");
    },
    60_000,
  );
});

describe.skipIf(hasDatabase)("assessment API flow", () => {
  it("requires DATABASE_URL for database-backed integration tests", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
