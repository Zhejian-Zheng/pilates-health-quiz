import { prisma } from "@/lib/prisma";

export async function getLatestSessionProgress(sessionId: string) {
  return prisma.user.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      subscription: {
        select: {
          status: true,
        },
      },
      assessments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          flowId: true,
          status: true,
          currentStep: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          answers: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              stepKey: true,
              questionKey: true,
              value: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });
}

type LatestSessionProgress = NonNullable<
  Awaited<ReturnType<typeof getLatestSessionProgress>>
>;

export function toSessionProgress(user: LatestSessionProgress) {
  const assessment = user.assessments[0];

  if (!assessment) {
    return null;
  }

  return {
    sessionId: user.sessionId,
    assessmentId: assessment.id,
    flowId: assessment.flowId,
    status: assessment.status,
    currentStep: assessment.currentStep,
    subscriptionStatus: user.subscription?.status ?? "INACTIVE",
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
    completedAt: assessment.completedAt?.toISOString() ?? null,
    answers: assessment.answers.map((answer) => ({
      id: answer.id,
      stepKey: answer.stepKey,
      questionKey: answer.questionKey,
      value: answer.value,
      createdAt: answer.createdAt.toISOString(),
      updatedAt: answer.updatedAt.toISOString(),
    })),
  };
}

export function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json(
    {
      error: {
        message,
        details,
      },
    },
    { status },
  );
}
