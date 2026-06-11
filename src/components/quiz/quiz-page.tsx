"use client";

import { HeroPanel } from "@/components/quiz/hero-panel";
import { ProgressRing } from "@/components/quiz/progress-ring";
import { QuestionPanel } from "@/components/quiz/question-panel";
import { ResultPanel } from "@/components/quiz/result-panel";
import { ReviewPanel } from "@/components/quiz/review-panel";
import { StepNavigator } from "@/components/quiz/step-navigator";
import { useQuizFlow } from "@/hooks/use-quiz-flow";
import { copy, questions } from "@/lib/quiz-content";

export function QuizPage() {
  const { actions, state } = useQuizFlow();
  const t = copy[state.language];

  if (state.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-6 text-[#171717]">
        <p className="animate-[page-fade_0.8s_ease_both] text-sm font-medium text-black/60">
          {String(t.loading)}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f3ef] text-[#171717]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(60,135,134,0.14),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(72,90,163,0.1),transparent_32%),linear-gradient(180deg,#f7f4ef_0%,#edf2f1_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 flex items-center justify-between gap-4 rounded-full border border-white/70 bg-white/78 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171717] text-sm font-semibold text-white">
              P
            </div>
            <span className="text-sm font-semibold">{String(t.brandEyebrow)}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/70 p-1 shadow-inner shadow-black/5">
            {(["en", "zh"] as const).map((item) => (
              <button
                aria-label={`${String(t.language)} ${item}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  state.language === item
                    ? "bg-[#171717] text-white shadow-sm"
                    : "text-black/55 hover:text-black"
                }`}
                key={item}
                onClick={() => actions.changeLanguage(item)}
                type="button"
              >
                {item === "en" ? "EN" : "中文"}
              </button>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-5 py-5">
          <HeroPanel
            answers={state.answers}
            language={state.language}
            remainingQuestionCount={state.remainingQuestionCount}
            sessionId={state.sessionId}
          />

          <section className="animate-[page-rise_0.65s_ease_0.08s_both] rounded-[28px] border border-white/70 bg-white/64 p-3 shadow-2xl shadow-black/8 backdrop-blur-xl sm:p-4">
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <div className="mb-4 rounded-[22px] bg-white/78 p-4 shadow-sm shadow-black/5">
                  <div className="flex items-center gap-4">
                    <ProgressRing value={state.visualProgress} />
                    <div className="min-w-0 flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-black/10">
                        <div
                          className="h-full rounded-full bg-[#171717] transition-all duration-700 ease-out"
                          style={{ width: `${state.visualProgress}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                        <span>
                          {state.result
                            ? String(t.result)
                            : state.language === "zh"
                              ? `${String(t.step)} ${state.currentStep + 1}`
                              : `${String(t.step)} ${state.currentStep + 1}`}
                        </span>
                        <span>{state.visualProgress}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <StepNavigator
                  answers={state.answers}
                  currentStep={state.currentStep}
                  language={state.language}
                  onReset={actions.startOver}
                  onStepSelect={actions.goToStep}
                  questions={questions}
                  reachableStep={state.reachableStep}
                  remainingCount={state.remainingQuestionCount}
                  resultReady={Boolean(state.result)}
                />
              </div>

              <div className="min-w-0 rounded-[24px] bg-white/88 p-5 shadow-sm shadow-black/5 backdrop-blur sm:p-6 lg:p-8">
                  {state.result ? (
                    <ResultPanel
                      isSaving={state.isSaving}
                      language={state.language}
                      onStartOver={actions.startOver}
                      onUnlock={actions.unlockResult}
                      result={state.result}
                    />
                  ) : state.currentQuestion ? (
                    <QuestionPanel
                      answer={state.answers[state.currentQuestion.key]}
                      inputValue={
                        state.numberDrafts[state.currentQuestion.key] ??
                        String(state.answers[state.currentQuestion.key] ?? "")
                      }
                      isSaving={state.isSaving}
                      language={state.language}
                      onBack={actions.goBack}
                      onInputChange={(value) =>
                        actions.setNumberDrafts((drafts) => ({
                          ...drafts,
                          [state.currentQuestion!.key]: value,
                        }))
                      }
                      onNext={actions.goNext}
                      onNumberSubmit={actions.submitNumberAnswer}
                      onSelect={(value) =>
                        actions.saveAnswer(state.currentQuestion!, value)
                      }
                      question={state.currentQuestion}
                      syncStatus={state.syncStatus}
                      stepIndex={state.currentStep}
                      totalSteps={questions.length}
                    />
                  ) : (
                    <ReviewPanel
                      answers={state.answers}
                      isSaving={state.isSaving}
                      language={state.language}
                      onBack={() => actions.goToStep(questions.length - 1)}
                      onComplete={actions.completeAssessment}
                      pendingSaveCount={state.pendingSaveCount}
                    />
                  )}

                  {state.error ? (
                    <p className="mt-5 rounded-2xl border border-[#ee505a]/30 bg-[#ee505a]/10 px-4 py-3 text-sm font-medium text-[#a12630]">
                      {state.error}
                    </p>
                  ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
