import type { AnswerValue, Question } from "@/lib/quiz-types";

export type StepNavigatorStatus =
  | "current"
  | "completed"
  | "unanswered"
  | "upcoming";

export type StepNavigatorItemState = {
  key: string;
  isAnswered: boolean;
  isComplete: boolean;
  isCurrent: boolean;
  isReachable: boolean;
  status: StepNavigatorStatus;
};

export function getDisplayedRemainingCount(
  remainingCount: number,
  resultReady: boolean,
) {
  return resultReady ? 0 : remainingCount;
}

export function getStepNavigatorItemStates({
  answers,
  currentStep,
  questions,
  reachableStep,
  resultReady,
}: {
  answers: Record<string, AnswerValue>;
  currentStep: number;
  questions: Question[];
  reachableStep: number;
  resultReady: boolean;
}) {
  return questions.map((question, index): StepNavigatorItemState => {
    const isAnswered = answers[question.key] !== undefined;
    const isComplete = resultReady || isAnswered;
    const isCurrent = !resultReady && currentStep === index;
    const isReachable = resultReady || index <= reachableStep;
    const status = isCurrent
      ? "current"
      : isComplete
        ? "completed"
        : isReachable
          ? "unanswered"
          : "upcoming";

    return {
      key: question.key,
      isAnswered,
      isComplete,
      isCurrent,
      isReachable,
      status,
    };
  });
}
