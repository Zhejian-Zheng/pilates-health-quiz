"use client";

import { AuthGate } from "@/components/quiz/auth-gate";
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
      <main className="flex min-h-screen items-center justify-center bg-[#f5fbf8] px-6 text-[#12312c]">
        <p className="animate-[page-fade_0.8s_ease_both] text-sm font-medium text-[#52746d]">
          {String(t.loading)}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5fbf8] text-[#12312c]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.12),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.07),transparent_26%),linear-gradient(180deg,#fbfefd_0%,#eef8f4_100%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-2 sm:px-7 lg:px-8">
        <div className="grid gap-5">
          <HeroPanel
            authProfile={state.authProfile}
            language={state.language}
            onLanguageChange={actions.changeLanguage}
            onLoginRequest={actions.returnHome}
            onLogout={actions.logout}
            onReturnHome={actions.returnHome}
            onUpgradeMembership={actions.upgradeMembership}
          />

          {!state.authProfile ? (
            <AuthGate
              error={state.error}
              language={state.language}
              onContinueAsGuest={actions.continueAsGuest}
              onSubmitAuth={actions.submitAuth}
            />
          ) : (
            <section className="animate-[page-rise_0.65s_ease_0.08s_both] pb-10">
              <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
                <div className="lg:sticky lg:top-7 lg:self-start">
                  <div className="mb-5">
                    <div className="flex items-center gap-3">
                      <ProgressRing value={state.visualProgress} />
                      <div className="min-w-0 flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#0f766e]/12">
                          <div
                            className="h-full rounded-full bg-[#0f766e] transition-all duration-700 ease-out"
                            style={{ width: `${state.visualProgress}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52746d]">
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

                <div className="min-w-0 pt-1">
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
                      onInputChange={(value) => {
                        actions.clearError();
                        actions.setNumberDrafts((drafts) => ({
                          ...drafts,
                          [state.currentQuestion!.key]: value,
                        }));
                      }}
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
                    <p className="mt-5 border-l-2 border-[#dc2626] bg-[#fee2e2]/60 px-4 py-3 text-sm font-medium text-[#991b1b]">
                      {state.error}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
