import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/sessions";

export const runtime = "nodejs";

type ResultRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, context: ResultRouteContext) {
  const { sessionId } = await context.params;
  const user = await prisma.user.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
        },
      },
      assessments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          result: {
            select: {
              bmi: true,
              bmiCategory: true,
              recommendedCalories: true,
              targetDate: true,
              summary: true,
              detailedRecommendation: true,
              projectionCurve: true,
            },
          },
        },
      },
    },
  });

  const assessment = user?.assessments[0];

  if (!user || !assessment) {
    return errorResponse("Session not found", 404);
  }

  if (!assessment.result) {
    return errorResponse("Assessment result not found", 404);
  }

  const subscriptionStatus = user.subscription?.status ?? "INACTIVE";
  const isPaid =
    subscriptionStatus === "ACTIVE" &&
    (!user.subscription?.expiresAt || user.subscription.expiresAt > new Date());

  const baseResult = {
    bmi: assessment.result.bmi,
    bmiCategory: assessment.result.bmiCategory,
    summary: assessment.result.summary,
  };

  return Response.json({
    sessionId: user.sessionId,
    assessmentId: assessment.id,
    assessmentStatus: assessment.status,
    subscriptionStatus,
    access: isPaid ? "FULL" : "LOCKED",
    result: isPaid
      ? {
          ...baseResult,
          recommendedCalories: assessment.result.recommendedCalories,
          targetDate: assessment.result.targetDate.toISOString(),
          detailedRecommendation: assessment.result.detailedRecommendation,
          projectionCurve: assessment.result.projectionCurve,
        }
      : {
          ...baseResult,
          paywall: {
            message: "Upgrade to unlock your full Pilates plan.",
            protectedFields: [
              "recommendedCalories",
              "targetDate",
              "detailedRecommendation",
              "projectionCurve",
            ],
          },
        },
  });
}
