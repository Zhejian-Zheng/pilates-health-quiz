import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { setAccountCookie } from "@/lib/account-cookie";
import { hashPassword } from "@/lib/password";
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
    const fallbackName = credentials.email.split("@")[0];
    const displayName = credentials.displayName || fallbackName;
    const sessionId = nanoid();
    const passwordHash = await hashPassword(credentials.password);

    const existingUser = await prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true },
    });

    if (existingUser) {
      return errorResponse("Account already exists", 409);
    }

    const user = await prisma.user.create({
      data: {
        sessionId,
        email: credentials.email,
        displayName,
        passwordHash,
        subscription: {
          create: {
            status: "INACTIVE",
          },
        },
        assessments: {
          create: {
            flowId: "2117",
          },
        },
      },
      select: {
        id: true,
      },
    });

    const progressUser = await getLatestSessionProgress(sessionId);
    const progress = progressUser ? toSessionProgress(progressUser) : null;

    if (!progress) {
      return errorResponse("Account was created but could not be loaded", 500);
    }

    const response = NextResponse.json(
      {
        profile: {
          mode: "login",
          displayName,
          email: credentials.email,
        },
        progress,
      },
      { status: 201 },
    );
    setAccountCookie(response, user.id);
    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid auth payload", 400, error.flatten());
    }

    console.error("Failed to register account", error);
    return errorResponse("Failed to register account", 500);
  }
}
