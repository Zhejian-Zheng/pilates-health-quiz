import { describe, expect, it, vi } from "vitest";

import {
  assertValidPaySignature,
  PayWebhookError,
  signPayWebhookBody,
} from "../src/lib/pay-webhook";

describe("pay webhook signature helpers", () => {
  it("accepts a valid HMAC signature", () => {
    const rawBody = JSON.stringify({ sessionId: "session_1" });
    const signature = signPayWebhookBody(rawBody, "secret");

    expect(() =>
      assertValidPaySignature(rawBody, signature, "secret"),
    ).not.toThrow();
  });

  it("rejects a missing signature when a secret is configured", () => {
    expect(() =>
      assertValidPaySignature("{}", null, "secret"),
    ).toThrow(PayWebhookError);
  });

  it("rejects an invalid signature", () => {
    const rawBody = JSON.stringify({ sessionId: "session_1" });
    const signature = signPayWebhookBody(rawBody, "wrong-secret");

    expect(() =>
      assertValidPaySignature(rawBody, signature, "secret"),
    ).toThrow("Invalid payment signature");
  });

  it("requires a secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => assertValidPaySignature("{}", null, "")).toThrow(
      "Payment webhook secret is not configured",
    );

    vi.unstubAllEnvs();
  });
});
