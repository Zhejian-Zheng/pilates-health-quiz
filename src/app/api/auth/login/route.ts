import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { setAccountCookie } from "@/lib/account-cookie";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { authSchema } from "@/lib/schemas";
import { setSessionCookie } from "@/lib/session-cookie";
import {
  errorResponse,
  getLatestSessionProgress,
  toSessionProgress,
} from "@/lib/sessions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const credentials = authSchema.parse(await request.json().catch(() => ({})));
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      select: {
        id: true,
        sessionId: true,
        email: true,
        displayName: true,
        passwordHash: true,
        assessments: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!user?.passwordHash) {
      return errorResponse("Invalid email or password", 401);
    }

    const passwordMatches = await verifyPassword(
      credentials.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return errorResponse("Invalid email or password", 401);
    }

    if (user.assessments.length === 0) {
      await prisma.assessmentSession.create({
        data: {
          userId: user.id,
          flowId: "2117",
        },
      });
    }

    const progressUser = await getLatestSessionProgress(user.sessionId);
    const progress = progressUser ? toSessionProgress(progressUser) : null;

    if (!progress) {
      return errorResponse("Account session could not be loaded", 500);
    }

    const email = user.email ?? credentials.email;
    const profile = {
      mode: "login",
      displayName: user.displayName ?? email.split("@")[0],
      email,
    };
    const response = NextResponse.json({ profile, progress });
    setAccountCookie(response, user.id);
    setSessionCookie(response, user.sessionId);

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid auth payload", 400, error.flatten());
    }

    console.error("Failed to log in", error);
    return errorResponse("Failed to log in", 500);
  }
}
