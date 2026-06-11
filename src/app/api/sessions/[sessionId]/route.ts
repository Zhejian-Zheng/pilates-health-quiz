import {
  errorResponse,
  getLatestSessionProgress,
  toSessionProgress,
} from "@/lib/sessions";

export const runtime = "nodejs";

type SessionRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, context: SessionRouteContext) {
  const { sessionId } = await context.params;
  const user = await getLatestSessionProgress(sessionId);

  if (!user) {
    return errorResponse("Session not found", 404);
  }

  const progress = toSessionProgress(user);

  if (!progress) {
    return errorResponse("Assessment not found for session", 404);
  }

  return Response.json(progress);
}
