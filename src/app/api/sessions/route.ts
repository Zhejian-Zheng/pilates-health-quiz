import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { readAccountCookie, setAccountCookie } from "@/lib/account-cookie";
import { prisma } from "@/lib/prisma";
import { createSessionSchema } from "@/lib/schemas";
import { setSessionCookie } from "@/lib/session-cookie";
import {
  errorResponse,
  getLatestSessionProgress,
  toSessionProgress,
} from "@/lib/sessions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { flowId } = createSessionSchema.parse(body);
    const accountUserId = readAccountCookie(request);
    const accountUser = accountUserId
      ? await prisma.user.findUnique({
          where: { id: accountUserId },
          select: { id: true, sessionId: true },
        })
      : null;
    const sessionId = accountUser?.sessionId ?? nanoid();

    if (accountUser) {
      await prisma.assessmentSession.create({
        data: {
          userId: accountUser.id,
          flowId,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          sessionId,
          subscription: {
            create: {
              status: "INACTIVE",
            },
          },
          assessments: {
            create: {
              flowId,
            },
          },
        },
      });
    }

    const user = await getLatestSessionProgress(sessionId);
    const progress = user ? toSessionProgress(user) : null;

    if (!progress) {
      return errorResponse("Session was created but could not be loaded", 500);
    }

    const response = NextResponse.json(progress, { status: 201 });
    setSessionCookie(response, sessionId);
    if (accountUser) {
      setAccountCookie(response, accountUser.id);
    }

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid session payload", 400, error.flatten());
    }

    console.error("Failed to create session", error);
    return errorResponse("Failed to create session", 500);
  }
}
