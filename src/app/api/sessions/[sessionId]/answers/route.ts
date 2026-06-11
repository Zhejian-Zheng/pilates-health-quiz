import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { saveAnswersSchema } from "@/lib/schemas";
import {
  errorResponse,
  getLatestSessionProgress,
  toSessionProgress,
} from "@/lib/sessions";
import { ZodError } from "zod";

export const runtime = "nodejs";

type AnswersRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function PATCH(request: Request, context: AnswersRouteContext) {
  try {
    const { sessionId } = await context.params;
    const payload = saveAnswersSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { sessionId },
      select: {
        assessments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            currentStep: true,
          },
        },
      },
    });

    const assessment = user?.assessments[0];

    if (!assessment) {
      return errorResponse("Session not found", 404);
    }

    if (assessment.status !== "IN_PROGRESS") {
      return errorResponse("Cannot update a completed assessment", 409);
    }

    for (const answer of payload.answers) {
      await prisma.assessmentAnswer.upsert({
        where: {
          assessmentId_questionKey: {
            assessmentId: assessment.id,
            questionKey: answer.questionKey,
          },
        },
        create: {
          assessmentId: assessment.id,
          stepKey: answer.stepKey,
          questionKey: answer.questionKey,
          value: answer.value as Prisma.InputJsonValue,
        },
        update: {
          stepKey: answer.stepKey,
          value: answer.value as Prisma.InputJsonValue,
        },
      });
    }

    await prisma.assessmentSession.update({
      where: {
        id: assessment.id,
      },
      data: {
        currentStep:
          payload.currentStep === undefined
            ? assessment.currentStep
            : Math.max(assessment.currentStep, payload.currentStep),
      },
    });

    const updatedUser = await getLatestSessionProgress(sessionId);
    const progress = updatedUser ? toSessionProgress(updatedUser) : null;

    if (!progress) {
      return errorResponse("Updated session could not be loaded", 500);
    }

    return Response.json(progress);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Invalid answers payload", 400, error.flatten());
    }

    console.error("Failed to save answers", error);
    return errorResponse("Failed to save answers", 500);
  }
}
