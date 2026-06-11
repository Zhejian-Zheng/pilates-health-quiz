import { useEffect } from "react";

import { copy } from "@/lib/quiz-content";
import type {
  AnswerValue,
  Language,
  Question,
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
  const visualOptionPrefix = getVisualOptionPrefix(question.key, language);
  const syncText = {
    idle: String(t.syncIdle),
    syncing: String(t.syncing),
    saved: String(t.synced),
    error: String(t.syncError),
  }[syncStatus];

  useEffect(() => {
    function handleEnterKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.isComposing || isSaving) {
        return;
      }

      if (event.target instanceof HTMLButtonElement) {
        return;
      }

      if (question.type === "number") {
        event.preventDefault();
        onNumberSubmit();
        return;
      }

      if (answer !== undefined) {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleEnterKey);
    return () => window.removeEventListener("keydown", handleEnterKey);
  }, [answer, isSaving, onNext, onNumberSubmit, question.type]);

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3c8786]">
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

      {question.type === "single" ? (
        <div className={`mt-7 grid gap-4 ${getOptionGridClass(question.options.length)}`}>
          {question.options.map((option, index) => (
            <button
              className={`group flex min-h-24 items-center justify-between gap-4 rounded-2xl border px-5 py-5 text-left text-base font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/8 ${
                answer === option.value
                  ? "border-[#171717] bg-[#171717] text-white shadow-lg shadow-black/12"
                  : "border-black/10 bg-white/86 text-black/78 hover:border-[#3c8786]/50 hover:bg-white"
              }`}
              disabled={isSaving}
              key={option.value}
              onClick={() => onSelect(option.value)}
              style={{ animationDelay: `${index * 55}ms` }}
              type="button"
            >
              <span className="min-w-0 leading-6">
                {visualOptionPrefix} {option.label[language]}
              </span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                answer === option.value
                  ? "border-white bg-white text-[#171717]"
                  : "border-black/14 bg-black/[0.03] text-transparent group-hover:border-[#3c8786]/40"
              }`}>
                ✓
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

function getOptionGridClass(optionCount: number) {
  if (optionCount === 3) {
    return "sm:grid-cols-3";
  }

  if (optionCount === 4) {
    return "sm:grid-cols-2";
  }

  return "sm:grid-cols-2";
}

function getVisualOptionPrefix(questionKey: string, language: Language) {
  const labels: Record<string, Record<Language, string>> = {
    activityLevel: { en: "Activity:", zh: "运动：" },
    ageRange: { en: "Age:", zh: "年龄：" },
    gender: { en: "Gender:", zh: "性别：" },
    goal: { en: "Goal:", zh: "目标：" },
  };

  return labels[questionKey]?.[language] ?? "";
}
