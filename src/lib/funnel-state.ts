import type { JsonValue } from "@/lib/schemas";

export type FunnelStepKey =
  | "ageRange"
  | "gender"
  | "goal"
  | "activityLevel"
  | "heightCm"
  | "currentWeightKg"
  | "targetWeightKg"
  | "age";

export type FunnelAnswerInput = {
  stepKey: string;
  questionKey: string;
  value: JsonValue;
};

export class FunnelStateError extends Error {
  constructor(
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = "FunnelStateError";
  }
}

export const FUNNEL_STEPS: readonly FunnelStepKey[] = [
  "ageRange",
  "gender",
  "goal",
  "activityLevel",
  "heightCm",
  "currentWeightKg",
  "targetWeightKg",
  "age",
];

export const REQUIRED_HEALTH_STEPS: readonly FunnelStepKey[] = [
  "gender",
  "goal",
  "activityLevel",
  "heightCm",
  "currentWeightKg",
  "targetWeightKg",
  "age",
];

const STEP_INDEX = new Map(
  FUNNEL_STEPS.map((stepKey, index) => [stepKey, index] as const),
);

export function validateAnswerTransition(
  currentStep: number,
  requestedStep: number | undefined,
  answers: FunnelAnswerInput[],
  savedAnswerKeys: string[] = [],
) {
  const uniqueAnswerSteps = new Set<FunnelStepKey>();
  const reachableStep = Math.max(
    currentStep,
    getSequentialAnsweredCount(savedAnswerKeys),
  );

  for (const answer of answers) {
    if (answer.stepKey !== answer.questionKey) {
      throw new FunnelStateError("stepKey must match questionKey");
    }

    const stepKey = toKnownStep(answer.questionKey);
    const stepIndex = STEP_INDEX.get(stepKey);

    if (stepIndex === undefined) {
      throw new FunnelStateError(`Unknown funnel step: ${answer.questionKey}`);
    }

    if (stepIndex > reachableStep) {
      throw new FunnelStateError(
        `Cannot submit ${answer.questionKey} before reaching that step`,
        409,
      );
    }

    uniqueAnswerSteps.add(stepKey);
  }

  if (requestedStep !== undefined) {
    if (requestedStep < reachableStep) {
      throw new FunnelStateError("currentStep cannot move backwards", 409);
    }

    const maxAdvance = reachableStep + uniqueAnswerSteps.size;

    if (requestedStep > maxAdvance) {
      throw new FunnelStateError("Cannot skip unanswered funnel steps", 409);
    }
  }
}

function getSequentialAnsweredCount(answerKeys: string[]) {
  const answered = new Set(answerKeys);
  let count = 0;

  for (const stepKey of FUNNEL_STEPS) {
    if (!answered.has(stepKey)) {
      break;
    }

    count += 1;
  }

  return count;
}

export function assertReadyToComplete(
  answers: Array<{ questionKey: string }>,
) {
  const answered = new Set(answers.map((answer) => answer.questionKey));
  const missing = REQUIRED_HEALTH_STEPS.filter((stepKey) => !answered.has(stepKey));

  if (missing.length > 0) {
    throw new FunnelStateError(
      `Missing required funnel steps: ${missing.join(", ")}`,
    );
  }
}

function toKnownStep(stepKey: string): FunnelStepKey {
  if (STEP_INDEX.has(stepKey as FunnelStepKey)) {
    return stepKey as FunnelStepKey;
  }

  throw new FunnelStateError(`Unknown funnel step: ${stepKey}`);
}
