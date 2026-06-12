import { getSessionResultPayload } from "@/lib/results";
import { errorResponse } from "@/lib/sessions";

export const runtime = "nodejs";

type ResultRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, context: ResultRouteContext) {
  const { sessionId } = await context.params;
  const result = await getSessionResultPayload(sessionId);

  if ("payload" in result) {
    return Response.json(result.payload);
  }

  return errorResponse(result.error, result.status);
}
