import { Prisma } from "@/generated/prisma/client";
import {
  AssessmentProfileError,
  extractHealthProfile,
} from "@/lib/assessment-profile";
import {
  assessHealth,
  HealthAssessmentError,
} from "@/lib/health-assessment";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/sessions";

export const runtime = "nodejs";

type CompleteRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(_request: Request, context: CompleteRouteContext) {
  try {
    const { sessionId } = await context.params;
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
            answers: {
              select: {
                stepKey: true,
                questionKey: true,
                value: true,
              },
            },
          },
        },
      },
    });

    const assessment = user?.assessments[0];

    if (!assessment) {
      return errorResponse("Session not found", 404);
    }

    const profile = extractHealthProfile(assessment.answers);
    const result = assessHealth(profile);

    await prisma.healthProfile.upsert({
      where: {
        assessmentId: assessment.id,
      },
      create: {
        assessmentId: assessment.id,
        gender: profile.gender,
        goal: profile.goal,
        age: profile.age,
        heightCm: profile.heightCm,
        currentWeightKg: profile.currentWeightKg,
        targetWeightKg: profile.targetWeightKg,
        activityLevel: profile.activityLevel,
      },
      update: {
        gender: profile.gender,
        goal: profile.goal,
        age: profile.age,
        heightCm: profile.heightCm,
        currentWeightKg: profile.currentWeightKg,
        targetWeightKg: profile.targetWeightKg,
        activityLevel: profile.activityLevel,
      },
    });

    await prisma.assessmentResult.upsert({
      where: {
        assessmentId: assessment.id,
      },
      create: {
        assessmentId: assessment.id,
        bmi: result.bmi,
        bmiCategory: result.bmiCategory,
        recommendedCalories: result.recommendedCalories,
        targetDate: result.targetDate,
        summary: result.summary,
        detailedRecommendation:
          result.detailedRecommendation as Prisma.InputJsonValue,
        projectionCurve: result.projectionCurve as Prisma.InputJsonValue,
      },
      update: {
        bmi: result.bmi,
        bmiCategory: result.bmiCategory,
        recommendedCalories: result.recommendedCalories,
        targetDate: result.targetDate,
        summary: result.summary,
        detailedRecommendation:
          result.detailedRecommendation as Prisma.InputJsonValue,
        projectionCurve: result.projectionCurve as Prisma.InputJsonValue,
      },
    });

    await prisma.assessmentSession.update({
      where: {
        id: assessment.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return Response.json({
      sessionId,
      assessmentId: assessment.id,
      status: "COMPLETED",
      resultUrl: `/api/results/${sessionId}`,
    });
  } catch (error) {
    if (
      error instanceof AssessmentProfileError ||
      error instanceof HealthAssessmentError
    ) {
      return errorResponse(error.message, 422);
    }

    console.error("Failed to complete assessment", error);
    return errorResponse("Failed to complete assessment", 500);
  }
}
