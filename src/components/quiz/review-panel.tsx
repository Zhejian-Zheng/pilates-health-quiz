import { copy } from "@/lib/quiz-content";
import { formatAnswerValue } from "@/lib/quiz-formatters";
import type { AnswerValue, Language } from "@/lib/quiz-types";

export function ReviewPanel({
  answers,
  isSaving,
  language,
  onBack,
  onComplete,
  pendingSaveCount,
}: {
  answers: Record<string, AnswerValue>;
  isSaving: boolean;
  language: Language;
  onBack: () => void;
  onComplete: () => void;
  pendingSaveCount: number;
}) {
  const t = copy[language];

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3c8786]">
        {String(t.reviewEyebrow)}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight">
        {String(t.reviewTitle)}
      </h2>
      <dl className="mt-7 grid gap-3 sm:grid-cols-2">
        {Object.entries(answers).map(([key, value]) => (
          <div className="rounded-2xl bg-[#f4f3ef] px-4 py-3" key={key}>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-black/38">
              {key}
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatAnswerValue(value, language)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          className="h-13 rounded-2xl border border-black/12 text-sm font-semibold text-black/62 transition hover:bg-black/[0.03]"
          disabled={isSaving}
          onClick={onBack}
          type="button"
        >
          {String(t.editAnswers)}
        </button>
        <button
          className="h-13 rounded-2xl bg-[#171717] text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/18 disabled:bg-black/40"
          disabled={isSaving}
          onClick={onComplete}
          type="button"
        >
          {isSaving
            ? pendingSaveCount > 0
              ? String(t.finishingSync)
              : String(t.calculating)
            : String(t.seeResult)}
        </button>
      </div>
    </div>
  );
}
