import {
  assertValidPaySignature,
  PayWebhookError,
  PAY_SIGNATURE_HEADER,
} from "@/lib/pay-webhook";
import { prisma } from "@/lib/prisma";
import { paySchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/sessions";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    assertValidPaySignature(rawBody, request.headers.get(PAY_SIGNATURE_HEADER));

    const payload = paySchema.parse(JSON.parse(rawBody || "{}"));
    const providerEventId =
      payload.providerEventId ?? buildProviderEventId(rawBody);
    const user = await prisma.user.findUnique({
      where: {
        sessionId: payload.sessionId,
      },
      select: {
        id: true,
        sessionId: true,
      },
    });

    if (!user) {
      return errorResponse("Session not found", 404);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const result = await prisma.$transaction(async (tx) => {
      const insertedCount = await tx.$executeRaw`
        INSERT INTO "PaymentEvent" (
          "id",
          "providerEventId",
          "sessionId",
          "eventType",
          "payload",
          "createdAt"
        )
        VALUES (
          ${nanoid()},
          ${providerEventId},
          ${user.sessionId},
          ${payload.eventType},
          CAST(${JSON.stringify(payload.payload)} AS jsonb),
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("providerEventId") DO NOTHING
      `;

      if (insertedCount === 0) {
        const existingEvents = await tx.$queryRaw<Array<{ sessionId: string }>>`
          SELECT "sessionId"
          FROM "PaymentEvent"
          WHERE "providerEventId" = ${providerEventId}
          LIMIT 1
        `;
        const existingEvent = existingEvents[0];

        if (existingEvent?.sessionId !== user.sessionId) {
          throw new PayWebhookError(
            "Payment event id belongs to another session",
            409,
          );
        }

        const subscription = await tx.subscription.findUnique({
          where: {
            userId: user.id,
          },
          select: {
            status: true,
            startedAt: true,
            expiresAt: true,
          },
        });

        return {
          idempotentReplay: true,
          subscription,
        };
      }

      const subscription = await tx.subscription.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          status: "ACTIVE",
          startedAt: now,
          expiresAt,
        },
        update: {
          status: "ACTIVE",
          startedAt: now,
          expiresAt,
        },
        select: {
          status: true,
          startedAt: true,
          expiresAt: true,
        },
      });

      return {
        idempotentReplay: false,
        subscription,
      };
    });

    if (!result.subscription) {
      return errorResponse("Subscription not found for payment event", 409);
    }

    return Response.json({
      sessionId: user.sessionId,
      providerEventId,
      idempotentReplay: result.idempotentReplay,
      subscriptionStatus: result.subscription.status,
      startedAt: result.subscription.startedAt?.toISOString() ?? null,
      expiresAt: result.subscription.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid payment payload", 400, error.flatten());
    }

    if (error instanceof PayWebhookError) {
      return errorResponse(error.message, error.status);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid payment JSON", 400);
    }

    console.error("Failed to process payment callback", error);
    return errorResponse("Failed to process payment callback", 500);
  }
}

function buildProviderEventId(rawBody: string) {
  return `mock_${createHash("sha256").update(rawBody).digest("hex")}`;
}
