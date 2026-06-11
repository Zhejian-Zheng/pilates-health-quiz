import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { paySchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/sessions";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = paySchema.parse(await request.json());
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

    await prisma.paymentEvent.create({
      data: {
        sessionId: user.sessionId,
        eventType: payload.eventType,
        payload: payload.payload as Prisma.InputJsonValue,
      },
    });

    const subscription = await prisma.subscription.upsert({
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

    return Response.json({
      sessionId: user.sessionId,
      subscriptionStatus: subscription.status,
      startedAt: subscription.startedAt?.toISOString() ?? null,
      expiresAt: subscription.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid payment payload", 400, error.flatten());
    }

    console.error("Failed to process payment callback", error);
    return errorResponse("Failed to process payment callback", 500);
  }
}
