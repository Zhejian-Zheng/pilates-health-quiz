import { NextResponse } from "next/server";

import {
  clearAccountCookie,
  readAccountCookie,
  setAccountCookie,
} from "@/lib/account-cookie";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "@/lib/session-cookie";
import { getLatestSessionProgress, toSessionProgress } from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const accountUserId = readAccountCookie(request);
  let sessionId = readSessionCookie(request);

  if (!sessionId && accountUserId) {
    const account = await prisma.user.findUnique({
      where: { id: accountUserId },
      select: { sessionId: true },
    });

    sessionId = account?.sessionId ?? null;
  }

  if (!sessionId) {
    return new NextResponse(null, { status: 204 });
  }

  const user = await getLatestSessionProgress(sessionId);
  const progress = user ? toSessionProgress(user) : null;

  if (!progress) {
    const response = new NextResponse(null, { status: 204 });
    clearSessionCookie(response);
    clearAccountCookie(response);

    return response;
  }

  const response = NextResponse.json(progress);
  setSessionCookie(response, sessionId);
  if (accountUserId) {
    setAccountCookie(response, accountUserId);
  }

  return response;
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);

  return response;
}
