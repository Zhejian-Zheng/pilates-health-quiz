import { NextResponse } from "next/server";

import { getSessionResultPayload } from "@/lib/results";
import { readSessionCookie, setSessionCookie } from "@/lib/session-cookie";
import { errorResponse } from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = readSessionCookie(request);

  if (!sessionId) {
    return errorResponse("Session cookie not found", 404);
  }

  const result = await getSessionResultPayload(sessionId);

  if (!("payload" in result)) {
    return errorResponse(result.error, result.status);
  }

  const response = NextResponse.json(result.payload);
  setSessionCookie(response, sessionId);

  return response;
}
