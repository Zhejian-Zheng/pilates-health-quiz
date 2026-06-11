import { copy } from "@/lib/quiz-content";
import { formatAnswerValue } from "@/lib/quiz-formatters";
import type { AnswerValue, Language, Question } from "@/lib/quiz-types";

export function StepNavigator({
  answers,
  currentStep,
  language,
  onReset,
  onStepSelect,
  questions,
  reachableStep,
  remainingCount,
  resultReady,
}: {
  answers: Record<string, AnswerValue>;
  currentStep: number;
  language: Language;
  onReset: () => void;
  onStepSelect: (step: number) => void;
  questions: Question[];
  reachableStep: number;
  remainingCount: number;
  resultReady: boolean;
}) {
  const t = copy[language];

  return (
    <aside className="rounded-[22px] bg-white/78 p-4 shadow-sm shadow-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3c8786]">
            {String(t.questionList)}
          </p>
          <p className="mt-1 text-sm font-semibold text-black/70">
            {remainingCount} {String(t.remaining)}
          </p>
        </div>
        <button
          className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/54 transition hover:bg-black/[0.04]"
          onClick={onReset}
          type="button"
        >
          {String(t.resetQuiz)}
        </button>
      </div>

      <div className="mt-4 grid max-h-[58vh] gap-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-280px)]">
        {questions.map((question, index) => {
          const isAnswered = answers[question.key] !== undefined;
          const isCurrent = !resultReady && currentStep === index;
          const isReachable = index <= reachableStep;
          const status = isCurrent
            ? String(t.current)
            : isAnswered
              ? String(t.completed)
              : isReachable
                ? String(t.unanswered)
                : String(t.upcoming);

          return (
            <button
              aria-current={isCurrent ? "step" : undefined}
              className={`group grid min-h-[64px] grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                isCurrent
                  ? "border-[#3c8786] bg-[#e9f4f2] shadow-sm shadow-[#3c8786]/10"
                  : isAnswered
                    ? "border-black/8 bg-white/82 hover:border-[#3c8786]/35"
                    : isReachable
                      ? "border-black/8 bg-white/58 hover:border-black/18"
                      : "cursor-not-allowed border-black/5 bg-black/[0.025] text-black/35"
              }`}
              disabled={!isReachable}
              key={question.key}
              onClick={() => onStepSelect(index)}
              type="button"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  isAnswered
                    ? "bg-[#171717] text-white"
                    : isCurrent
                      ? "bg-[#3c8786] text-white"
                      : "bg-black/[0.06] text-black/42"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-black/76">
                  {question.title[language]}
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs text-black/42">
                  <span>{status}</span>
                  {isAnswered ? (
                    <span className="truncate text-black/52">
                      {formatAnswerValue(answers[question.key], language)}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
