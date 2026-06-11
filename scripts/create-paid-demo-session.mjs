const appUrl = process.env.APP_URL ?? "http://localhost:3000";

const answers = [
  { stepKey: "gender", questionKey: "gender", value: "female" },
  { stepKey: "goal", questionKey: "goal", value: "Lose weight" },
  { stepKey: "activityLevel", questionKey: "activityLevel", value: "moderate" },
  { stepKey: "heightCm", questionKey: "heightCm", value: 165 },
  { stepKey: "currentWeightKg", questionKey: "currentWeightKg", value: 80 },
  { stepKey: "targetWeightKg", questionKey: "targetWeightKg", value: 70 },
  { stepKey: "age", questionKey: "age", value: 30 },
];

async function main() {
  const created = await request("/api/sessions", {
    method: "POST",
    body: { flowId: "2117" },
  });

  await request(`/api/sessions/${created.sessionId}/answers`, {
    method: "PATCH",
    body: {
      currentStep: 31,
      answers,
    },
  });

  await request(`/api/sessions/${created.sessionId}/complete`, {
    method: "POST",
  });

  const locked = await request(`/api/results/${created.sessionId}`);

  await request("/api/pay", {
    method: "POST",
    body: {
      sessionId: created.sessionId,
      payload: {
        source: "demo-script",
      },
    },
  });

  const full = await request(`/api/results/${created.sessionId}`);

  console.log(JSON.stringify({
    appUrl,
    sessionId: created.sessionId,
    lockedAccess: locked.access,
    fullAccess: full.access,
    resultUrl: `${appUrl}/api/results/${created.sessionId}`,
  }, null, 2));
}

async function request(path, options = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    method: options.method ?? "GET",
    headers: options.body
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} failed: ${JSON.stringify(body)}`,
    );
  }

  return body;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
