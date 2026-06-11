import { createHmac, timingSafeEqual } from "node:crypto";

export const PAY_SIGNATURE_HEADER = "x-pay-signature";

export class PayWebhookError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "PayWebhookError";
  }
}

export function assertValidPaySignature(
  rawBody: string,
  signature: string | null,
  secret = process.env.PAY_WEBHOOK_SECRET,
) {
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new PayWebhookError("Payment webhook secret is not configured", 500);
    }

    return;
  }

  if (!signature) {
    throw new PayWebhookError("Missing payment signature", 401);
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (!safeEqual(signature, expected)) {
    throw new PayWebhookError("Invalid payment signature", 401);
  }
}

export function signPayWebhookBody(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function safeEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
