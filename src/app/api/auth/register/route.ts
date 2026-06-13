import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { setAccountCookie } from "@/lib/account-cookie";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { authSchema } from "@/lib/schemas";
import { readSessionCookie, setSessionCookie } from "@/lib/session-cookie";
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
    const currentSessionId = readSessionCookie(request);
    const passwordHash = await hashPassword(credentials.password);

    const existingUser = await prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true },
    });

    if (existingUser) {
      return errorResponse("Account already exists", 409);
    }

    const guestUser = currentSessionId
      ? await prisma.user.findUnique({
          where: { sessionId: currentSessionId },
          select: {
            id: true,
            sessionId: true,
            email: true,
          },
        })
      : null;

    if (guestUser?.email) {
      return errorResponse("Current session already belongs to an account", 409);
    }

    const user = guestUser
      ? await prisma.user.update({
          where: { id: guestUser.id },
          data: {
            email: credentials.email,
            displayName,
            passwordHash,
          },
          select: {
            id: true,
            sessionId: true,
          },
        })
      : await prisma.user.create({
          data: {
            sessionId: nanoid(),
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
            sessionId: true,
          },
        });

    if (guestUser) {
      await prisma.subscription.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          status: "INACTIVE",
        },
        update: {},
      });
    }

    const progressUser = await getLatestSessionProgress(user.sessionId);
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
    setSessionCookie(response, user.sessionId);

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid auth payload", 400, error.flatten());
    }

    if (isEmailUniqueConstraintError(error)) {
      return errorResponse("Account already exists", 409);
    }

    console.error("Failed to register account", error);
    return errorResponse("Failed to register account", 500);
  }
}

function isEmailUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("email")
  );
}
