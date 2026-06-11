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
    <aside className="border-t border-black/8 pt-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3c8786]">
            {String(t.questionList)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-black/70">
            {remainingCount} {String(t.remaining)}
          </p>
        </div>
        <button
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-black/48 transition hover:bg-black/[0.04] hover:text-black/74"
          onClick={onReset}
          type="button"
        >
          {String(t.resetQuiz)}
        </button>
      </div>

      <div className="mt-4 grid max-h-[54vh] gap-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-230px)]">
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
              className={`group grid min-h-[50px] grid-cols-[26px_minmax(0,1fr)] items-center gap-2.5 rounded-xl px-2 py-2 text-left transition ${
                isCurrent
                  ? "bg-[#e9f4f2]"
                  : isAnswered
                    ? "hover:bg-white/62"
                    : isReachable
                      ? "hover:bg-white/50"
                      : "cursor-not-allowed text-black/35"
              }`}
              disabled={!isReachable}
              key={question.key}
              onClick={() => onStepSelect(index)}
              type="button"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
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
                <span className="block truncate text-[13px] font-semibold text-black/76">
                  {question.title[language]}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-black/42">
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
