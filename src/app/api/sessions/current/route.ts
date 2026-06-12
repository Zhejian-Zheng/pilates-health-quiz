import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "@/lib/session-cookie";
import {
  errorResponse,
  getLatestSessionProgress,
  toSessionProgress,
} from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = readSessionCookie(request);

  if (!sessionId) {
    return errorResponse("Session cookie not found", 404);
  }

  const user = await getLatestSessionProgress(sessionId);
  const progress = user ? toSessionProgress(user) : null;

  if (!progress) {
    const response = NextResponse.json(
      { error: { message: "Session not found" } },
      { status: 404 },
    );
    clearSessionCookie(response);

    return response;
  }

  const response = NextResponse.json(progress);
  setSessionCookie(response, sessionId);

  return response;
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);

  return response;
}
