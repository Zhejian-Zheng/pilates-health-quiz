import { nanoid } from "nanoid";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { createSessionSchema } from "@/lib/schemas";
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
    const sessionId = nanoid();

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

    const user = await getLatestSessionProgress(sessionId);
    const progress = user ? toSessionProgress(user) : null;

    if (!progress) {
      return errorResponse("Session was created but could not be loaded", 500);
    }

    return Response.json(progress, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid session payload", 400, error.flatten());
    }

    console.error("Failed to create session", error);
    return errorResponse("Failed to create session", 500);
  }
}
