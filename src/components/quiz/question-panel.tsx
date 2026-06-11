import { copy } from "@/lib/quiz-content";
import type {
  AnswerValue,
  Language,
  Question,
  QuestionImage,
  SyncStatus,
} from "@/lib/quiz-types";

export function QuestionPanel({
  answer,
  inputValue,
  isSaving,
  language,
  onBack,
  onInputChange,
  onNext,
  onNumberSubmit,
  onSelect,
  question,
  stepIndex,
  syncStatus,
  totalSteps,
}: {
  answer: AnswerValue | undefined;
  inputValue: string;
  isSaving: boolean;
  language: Language;
  onBack: () => void;
  onInputChange: (value: string) => void;
  onNext: () => void;
  onNumberSubmit: () => void;
  onSelect: (value: string) => void;
  question: Question;
  stepIndex: number;
  syncStatus: SyncStatus;
  totalSteps: number;
}) {
  const t = copy[language];
  const syncText = {
    idle: String(t.syncIdle),
    syncing: String(t.syncing),
    saved: String(t.synced),
    error: String(t.syncError),
  }[syncStatus];

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3c8786]">
          {String(t.quizLabel)} · {stepIndex + 1}/{totalSteps}
        </p>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-[#171717] sm:text-4xl">
          {question.title[language]}
        </h2>
        {question.helper ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/58">
            {question.helper[language]}
          </p>
        ) : null}
      </div>

      {question.image ? (
        <QuestionVisual image={question.image} language={language} />
      ) : null}

      {question.type === "single" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.options.map((option, index) => (
            <button
              className={`group flex min-h-20 items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left text-base font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/8 ${
                answer === option.value
                  ? "border-[#3c8786] bg-[#e9f4f2] text-[#205c5a]"
                  : "border-black/10 bg-white/82 text-black/78 hover:border-[#3c8786]/50 hover:bg-white"
              }`}
              disabled={isSaving}
              key={option.value}
              onClick={() => onSelect(option.value)}
              style={{ animationDelay: `${index * 55}ms` }}
              type="button"
            >
              <span className="min-w-0 leading-6">{option.label[language]}</span>
              <span className="shrink-0 rounded-full bg-black/[0.04] px-3 py-1 text-xs text-black/42 transition group-hover:bg-[#3c8786]/10">
                {answer === option.value ? String(t.selected) : String(t.choose)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 max-w-2xl">
          <label className="block text-sm font-semibold text-black/58">
            {question.suffix[language]}
          </label>
          <input
            className="mt-3 h-16 w-full rounded-2xl border border-black/12 bg-white/86 px-5 text-2xl font-semibold outline-none transition focus:border-[#3c8786] focus:ring-4 focus:ring-[#3c8786]/10"
            inputMode="decimal"
            max={question.max}
            min={question.min}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={question.placeholder}
            type="number"
            value={inputValue}
          />
          <button
            className="mt-5 h-13 w-full rounded-2xl bg-[#171717] px-5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/18 disabled:cursor-not-allowed disabled:bg-black/40"
            disabled={isSaving}
            onClick={onNumberSubmit}
            type="button"
          >
            {String(t.continue)}
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-3 border-t border-black/8 pt-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <button
          className="h-11 rounded-2xl border border-black/12 px-5 text-sm font-semibold text-black/58 transition hover:bg-black/[0.03] disabled:text-black/25"
          disabled={isSaving || stepIndex === 0}
          onClick={onBack}
          type="button"
        >
          {String(t.back)}
        </button>
        <span className="text-center text-sm text-black/42">{syncText}</span>
        <button
          className="h-11 rounded-2xl bg-[#171717] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/14 disabled:cursor-not-allowed disabled:bg-black/35"
          disabled={isSaving || answer === undefined}
          onClick={onNext}
          type="button"
        >
          {String(t.next)}
        </button>
      </div>
    </div>
  );
}

function QuestionVisual({
  image,
  language,
}: {
  image: QuestionImage;
  language: Language;
}) {
  return (
    <figure className="mt-6 grid overflow-hidden rounded-[20px] border border-black/8 bg-[#171717] text-white shadow-lg shadow-black/8 sm:grid-cols-[220px_minmax(0,1fr)]">
      <div
        aria-label={image.alt[language]}
        className="h-40 bg-cover bg-center sm:h-full"
        role="img"
        style={{
          backgroundImage: `linear-gradient(180deg,rgba(23,23,23,0.04),rgba(23,23,23,0.18)),url('${image.src}')`,
        }}
      />
      <figcaption className="flex min-h-28 flex-col justify-center px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
          {language === "zh" ? "说明" : "Context"}
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-white/78">
          {image.caption?.[language] ?? image.alt[language]}
        </p>
      </figcaption>
    </figure>
  );
}
