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

describe("cookie-backed current endpoints", () => {
  it("rejects current session, current result, and cookie-backed payment without a session cookie", async () => {
    const { GET: getCurrentSession } = await import(
      "../src/app/api/sessions/current/route"
    );
    const { GET: getCurrentResult } = await import(
      "../src/app/api/results/current/route"
    );
    const { POST: pay } = await import("../src/app/api/pay/route");

    const sessionResponse = await getCurrentSession(
      new Request("http://test.local/api/sessions/current"),
    );
    const session = await sessionResponse.json();

    expect(sessionResponse.status).toBe(404);
    expect(session.error.message).toContain("Session cookie not found");

    const resultResponse = await getCurrentResult(
      new Request("http://test.local/api/results/current"),
    );
    const result = await resultResponse.json();

    expect(resultResponse.status).toBe(404);
    expect(result.error.message).toContain("Session cookie not found");

    const paymentBody = JSON.stringify({
      payload: {
        source: "cookie-missing-test",
      },
    });
    const paymentHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.PAY_WEBHOOK_SECRET) {
      const { PAY_SIGNATURE_HEADER, signPayWebhookBody } = await import(
        "../src/lib/pay-webhook"
      );
      paymentHeaders[PAY_SIGNATURE_HEADER] = signPayWebhookBody(
        paymentBody,
        process.env.PAY_WEBHOOK_SECRET,
      );
    }

    const paymentResponse = await pay(
      new Request("http://test.local/api/pay", {
        method: "POST",
        headers: paymentHeaders,
        body: paymentBody,
      }),
    );
    const payment = await paymentResponse.json();

    expect(paymentResponse.status).toBe(404);
    expect(payment.error.message).toContain("Session cookie not found");
  });
});

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
      const { GET: getCurrentResult } = await import(
        "../src/app/api/results/current/route"
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

      const lockedCurrentResponse = await getCurrentResult(
        new Request("http://test.local/api/results/current", {
          headers: {
            cookie: toCookieHeader(createdResponse),
          },
        }),
      );
      const lockedCurrent = await lockedCurrentResponse.json();

      expect(lockedCurrentResponse.status).toBe(200);
      expect(lockedCurrent.sessionId).toBe(created.sessionId);
      expect(lockedCurrent.access).toBe("LOCKED");

      const paidResponse = await pay(
        jsonRequest("http://test.local/api/pay", {
          providerEventId: `test_payment_${created.sessionId}`,
          payload: { test: true },
        }, "POST", {
          cookie: toCookieHeader(createdResponse),
        }),
      );
      const paid = await paidResponse.json();

      expect(paidResponse.status).toBe(200);
      expect(paid.idempotentReplay).toBe(false);
      expect(paid.subscriptionStatus).toBe("ACTIVE");

      const replayResponse = await pay(
        jsonRequest("http://test.local/api/pay", {
          providerEventId: `test_payment_${created.sessionId}`,
          payload: { test: true },
        }, "POST", {
          cookie: toCookieHeader(createdResponse),
        }),
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

      const fullCurrentResponse = await getCurrentResult(
        new Request("http://test.local/api/results/current", {
          headers: {
            cookie: toCookieHeader(createdResponse),
          },
        }),
      );
      const fullCurrent = await fullCurrentResponse.json();

      expect(fullCurrentResponse.status).toBe(200);
      expect(fullCurrent.access).toBe("FULL");
      expect(fullCurrent.result.projectionCurve.length).toBeGreaterThan(1);
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
    "updates a duplicate answer sequentially instead of appending another row",
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

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      for (const value of ["18-29", "30-39"]) {
        const response = await saveAnswers(
          jsonRequest(
            `http://test.local/api/sessions/${created.sessionId}/answers`,
            {
              currentStep: 1,
              answers: [
                {
                  stepKey: "ageRange",
                  questionKey: "ageRange",
                  value,
                },
              ],
            },
            "PATCH",
          ),
          context,
        );

        expect(response.status).toBe(200);
      }

      const currentResponse = await getCurrentSession(
        new Request("http://test.local/api/sessions/current", {
          headers: {
            cookie: toCookieHeader(createdResponse),
          },
        }),
      );
      const current = await currentResponse.json();
      const ageRangeAnswers = current.answers.filter(
        (answer: { questionKey: string }) => answer.questionKey === "ageRange",
      );

      expect(currentResponse.status).toBe(200);
      expect(current.currentStep).toBe(1);
      expect(ageRangeAnswers).toEqual([
        expect.objectContaining({
          value: "30-39",
        }),
      ]);
    },
    60_000,
  );

  it(
    "handles concurrent duplicate answer updates without creating duplicates",
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

      const createdResponse = await createSession(
        jsonRequest("http://test.local/api/sessions", { flowId: "2117" }),
      );
      const created = await createdResponse.json();
      const context = {
        params: Promise.resolve({ sessionId: created.sessionId as string }),
      };

      const responses = await Promise.all([
        saveAnswers(
          jsonRequest(
            `http://test.local/api/sessions/${created.sessionId}/answers`,
            {
              currentStep: 1,
              answers: [
                {
                  stepKey: "ageRange",
                  questionKey: "ageRange",
                  value: "18-29",
                },
              ],
            },
            "PATCH",
          ),
          context,
        ),
        saveAnswers(
          jsonRequest(
            `http://test.local/api/sessions/${created.sessionId}/answers`,
            {
              currentStep: 1,
              answers: [
                {
                  stepKey: "ageRange",
                  questionKey: "ageRange",
                  value: "30-39",
                },
              ],
            },
            "PATCH",
          ),
          context,
        ),
      ]);

      expect(responses.map((response) => response.status)).toEqual([200, 200]);

      const currentResponse = await getCurrentSession(
        new Request("http://test.local/api/sessions/current", {
          headers: {
            cookie: toCookieHeader(createdResponse),
          },
        }),
      );
      const current = await currentResponse.json();
      const ageRangeAnswers = current.answers.filter(
        (answer: { questionKey: string }) => answer.questionKey === "ageRange",
      );

      expect(currentResponse.status).toBe(200);
      expect(current.currentStep).toBe(1);
      expect(ageRangeAnswers).toHaveLength(1);
      expect(["18-29", "30-39"]).toContain(ageRangeAnswers[0].value);
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

  it(
    "rejects answer updates after an assessment is completed",
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

      await saveAnswersSequentially(
        saveAnswers,
        created.sessionId,
        context,
        healthAnswers,
      );

      const completedResponse = await completeAssessment(
        new Request(
          `http://test.local/api/sessions/${created.sessionId}/complete`,
          { method: "POST" },
        ),
        context,
      );

      expect(completedResponse.status).toBe(200);

      const updateResponse = await saveAnswers(
        jsonRequest(
          `http://test.local/api/sessions/${created.sessionId}/answers`,
          {
            currentStep: 8,
            answers: [
              {
                stepKey: "age",
                questionKey: "age",
                value: 31,
              },
            ],
          },
          "PATCH",
        ),
        context,
      );
      const update = await updateResponse.json();

      expect(updateResponse.status).toBe(409);
      expect(update.error.message).toContain("completed assessment");
    },
    60_000,
  );
});

describe.skipIf(hasDatabase)("assessment API flow", () => {
  it("requires DATABASE_URL for database-backed integration tests", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
  });
});

function jsonRequest(
  url: string,
  body: unknown,
  method = "POST",
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
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
