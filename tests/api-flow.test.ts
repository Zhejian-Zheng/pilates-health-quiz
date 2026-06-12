import { describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const healthAnswers = [
  { stepKey: "ageRange", questionKey: "ageRange", value: "30-39" },
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
      const { GET: getCurrentSession } = await import(
        "../src/app/api/sessions/current/route"
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
      expect(createdResponse.headers.get("set-cookie")).toContain(
        "pilates_health_quiz_session",
      );

      const saved = await saveAnswersSequentially(
        saveAnswers,
        created.sessionId,
        context,
        healthAnswers,
      );

      expect(saved.answers).toHaveLength(8);

      const currentResponse = await getCurrentSession(
        new Request("http://test.local/api/sessions/current", {
          headers: {
            cookie: toCookieHeader(createdResponse),
          },
        }),
      );
      const current = await currentResponse.json();

      expect(currentResponse.status).toBe(200);
      expect(current.sessionId).toBe(created.sessionId);
      expect(current.answers).toHaveLength(8);

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
            providerEventId: `test_payment_${created.sessionId}`,
            payload: { test: true },
          },
          "POST",
        ),
      );
      const paid = await paidResponse.json();

      expect(paidResponse.status).toBe(200);
      expect(paid.idempotentReplay).toBe(false);
      expect(paid.subscriptionStatus).toBe("ACTIVE");

      const replayResponse = await pay(
        jsonRequest(
          "http://test.local/api/pay",
          {
            sessionId: created.sessionId,
            providerEventId: `test_payment_${created.sessionId}`,
            payload: { test: true },
          },
          "POST",
        ),
      );
      const replay = await replayResponse.json();

      expect(replayResponse.status).toBe(200);
      expect(replay.idempotentReplay).toBe(true);
      expect(replay.subscriptionStatus).toBe("ACTIVE");

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

      await saveAnswersSequentially(saveAnswers, created.sessionId, context, [
        { stepKey: "ageRange", questionKey: "ageRange", value: "30-39" },
        { stepKey: "gender", questionKey: "gender", value: "female" },
      ]);

      const completedResponse = await completeAssessment(
        new Request(
          `http://test.local/api/sessions/${created.sessionId}/complete`,
          { method: "POST" },
        ),
        context,
      );
      const completed = await completedResponse.json();

      expect(completedResponse.status).toBe(422);
      expect(completed.error.message).toContain("Missing required funnel steps");
    },
    60_000,
  );

  it(
    "rejects skipped funnel steps",
    async () => {
      const { POST: createSession } = await import(
        "../src/app/api/sessions/route"
      );
      const { PATCH: saveAnswers } = await import(
        "../src/app/api/sessions/[sessionId]/answers/route"
      );

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      const skippedResponse = await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 2,
            answers: [
              { stepKey: "ageRange", questionKey: "ageRange", value: "30-39" },
            ],
          },
          "PATCH",
        ),
        context,
      );
      const skipped = await skippedResponse.json();

      expect(skippedResponse.status).toBe(409);
      expect(skipped.error.message).toContain("Cannot skip");
    },
    60_000,
  );

  it(
    "accepts the next answer when saved answers are ahead of currentStep",
    async () => {
      const { POST: createSession } = await import(
        "../src/app/api/sessions/route"
      );
      const { PATCH: saveAnswers } = await import(
        "../src/app/api/sessions/[sessionId]/answers/route"
      );
      const { prisma } = await import("../src/lib/prisma");

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      const user = await prisma.user.findUniqueOrThrow({
        where: { sessionId: created.sessionId },
        select: { assessments: { select: { id: true }, take: 1 } },
      });
      const assessmentId = user.assessments[0].id;

      await prisma.assessmentAnswer.createMany({
        data: healthAnswers.slice(0, 4).map((answer) => ({
          assessmentId,
          stepKey: answer.stepKey,
          questionKey: answer.questionKey,
          value: answer.value,
        })),
      });

      const response = await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 5,
            answers: [
              { stepKey: "heightCm", questionKey: "heightCm", value: 165 },
            ],
          },
          "PATCH",
        ),
        context,
      );
      const saved = await response.json();

      expect(response.status).toBe(200);
      expect(saved.currentStep).toBe(5);
      expect(saved.answers).toHaveLength(5);
    },
    60_000,
  );

  it(
    "rejects unknown answer keys",
    async () => {
      const { POST: createSession } = await import(
        "../src/app/api/sessions/route"
      );
      const { PATCH: saveAnswers } = await import(
        "../src/app/api/sessions/[sessionId]/answers/route"
      );

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      const invalidResponse = await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 1,
            answers: [
              { stepKey: "ageRange", questionKey: "unknown", value: "30-39" },
            ],
          },
          "PATCH",
        ),
        context,
      );
      const invalid = await invalidResponse.json();

      expect(invalidResponse.status).toBe(422);
      expect(invalid.error.message).toContain("stepKey must match questionKey");
    },
    60_000,
  );

  it(
    "rejects out-of-range saved answer values",
    async () => {
      const { POST: createSession } = await import(
        "../src/app/api/sessions/route"
      );
      const { PATCH: saveAnswers } = await import(
        "../src/app/api/sessions/[sessionId]/answers/route"
      );

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      await saveAnswersSequentially(saveAnswers, created.sessionId, context, [
        { stepKey: "ageRange", questionKey: "ageRange", value: "30-39" },
        { stepKey: "gender", questionKey: "gender", value: "female" },
        { stepKey: "goal", questionKey: "goal", value: "Lose weight" },
        { stepKey: "activityLevel", questionKey: "activityLevel", value: "moderate" },
      ]);

      const invalidResponse = await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 5,
            answers: [
              { stepKey: "heightCm", questionKey: "heightCm", value: 17 },
            ],
          },
          "PATCH",
        ),
        context,
      );
      const invalid = await invalidResponse.json();

      expect(invalidResponse.status).toBe(422);
      expect(invalid.error.message).toContain("heightCm");
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

function toCookieHeader(response: Response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function saveAnswersSequentially(
  saveAnswers: (
    request: Request,
    context: { params: Promise<{ sessionId: string }> },
  ) => Promise<Response>,
  sessionId: string,
  context: { params: Promise<{ sessionId: string }> },
  answers: typeof healthAnswers,
) {
  let latest: unknown;

  for (const [index, answer] of answers.entries()) {
    const response = await saveAnswers(
      jsonRequest(
        `http://test.local/api/sessions/${sessionId}/answers`,
        {
          currentStep: index + 1,
          answers: [answer],
        },
        "PATCH",
      ),
      context,
    );

    expect(response.status).toBe(200);
    latest = await response.json();
  }

  return latest as { answers: unknown[] };
}
