import { copy } from "@/lib/quiz-content";
import {
  formatSummary,
  translateActivityLabel,
  translateBmiCategory,
} from "@/lib/quiz-formatters";
import type { Language, ResultResponse } from "@/lib/quiz-types";

export function ResultPanel({
  isSaving,
  language,
  onStartOver,
  onUnlock,
  result,
}: {
  isSaving: boolean;
  language: Language;
  onStartOver: () => void;
  onUnlock: () => void;
  result: ResultResponse;
}) {
  const t = copy[language];
  const isFull = result.access === "FULL";
  const paywallBenefits =
    language === "zh"
      ? ["每日建议摄入热量", "目标体重预测日期", "逐周体重变化曲线", "个性化训练重点"]
      : [
          "Recommended daily calories",
          "Target prediction date",
          "Weekly weight projection",
          "Personalized training focus",
        ];

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
        {isFull ? String(t.planUnlocked) : String(t.profilePreview)}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#12312c]">
        {isFull ? String(t.unlockedTitle) : String(t.lockedTitle)}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#52746d]">
        {formatSummary(result.result.summary, language)}
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Metric label={String(t.bmi)} value={String(result.result.bmi)} />
        <Metric
          label={String(t.category)}
          value={translateBmiCategory(result.result.bmiCategory, language)}
        />
        {isFull && result.result.recommendedCalories ? (
          <Metric
            label={String(t.calories)}
            value={`${result.result.recommendedCalories} kcal`}
          />
        ) : null}
        {isFull && result.result.targetDate ? (
          <Metric
            label={String(t.targetDate)}
            value={new Date(result.result.targetDate).toLocaleDateString(
              language === "zh" ? "zh-CN" : "en-US",
            )}
          />
        ) : null}
        {isFull && result.result.detailedRecommendation ? (
          <>
            <Metric
              label={String(t.bmr)}
              value={`${result.result.detailedRecommendation.bmr} kcal`}
            />
            <Metric
              label={String(t.tdee)}
              value={`${result.result.detailedRecommendation.tdee} kcal`}
            />
          </>
        ) : null}
      </div>

      {isFull && result.result.detailedRecommendation?.report ? (
        <div className="mt-7 rounded-3xl border border-[#0f766e]/10 bg-white/68 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">{String(t.reportTitle)}</h3>
              <p className="mt-1 text-xs text-[#52746d]">
                {result.result.detailedRecommendation.report.formula} · 7700 kcal/kg
              </p>
            </div>
            <p className="text-xs font-medium text-[#52746d]">
              {language === "zh" ? "目标差值" : "Target delta"}{" "}
              {result.result.detailedRecommendation.report.targetWeightDeltaKg} kg
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            {result.result.detailedRecommendation.report.scenarios.map(
              (scenario) => (
                <div
                  className="grid gap-3 rounded-2xl bg-[#f3fbf8] px-4 py-3 text-sm sm:grid-cols-[1.1fr_0.9fr_0.9fr]"
                  key={scenario.activityLevel}
                >
                  <div>
                    <p className="font-semibold">
                      {translateActivityLabel(scenario.activityLevel, language)}
                    </p>
                    <p className="mt-1 text-xs text-[#52746d]">
                      TDEE {scenario.tdee} kcal · ×{scenario.activityFactor}
                    </p>
                  </div>
                  <ScenarioCell
                    calories={scenario.mildDailyCalories}
                    label={String(t.mildCut)}
                    language={language}
                    targetDate={scenario.mildTargetDate}
                    weeks={scenario.mildWeeksToTarget}
                  />
                  <ScenarioCell
                    calories={scenario.standardDailyCalories}
                    label={String(t.standardCut)}
                    language={language}
                    targetDate={scenario.standardTargetDate}
                    weeks={scenario.standardWeeksToTarget}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {isFull && result.result.projectionCurve ? (
        <div className="mt-7 rounded-3xl border border-[#0f766e]/10 bg-white/68 p-5">
          <h3 className="text-sm font-semibold">{String(t.projection)}</h3>
          <div className="mt-5 flex h-36 items-end gap-1.5">
            {result.result.projectionCurve.slice(0, 18).map((point, index) => {
              const height = Math.max(18, 100 - index * 3.2);

              return (
                <div
                  className="flex flex-1 items-end"
                  key={`${point.week}-${point.weightKg}`}
                  title={`${point.date}: ${point.weightKg}kg`}
                >
                  <div
                    className="w-full rounded-t-md bg-[#0f766e] transition-all duration-700"
                    style={{
                      height: `${height}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-7 rounded-3xl border border-[#0f766e]/18 bg-[#e2f4ef] p-5">
          <h3 className="text-sm font-semibold text-[#115e59]">
            {String(t.fullPlanLocked)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#52746d]">
            {String(t.defaultPaywall)}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {paywallBenefits.map((benefit) => (
              <div
                className="flex items-center gap-2 rounded-2xl bg-white/58 px-3 py-2 text-sm font-semibold text-[#12312c]"
                key={benefit}
              >
                <span className="h-2 w-2 rounded-full bg-[#0f766e]" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          className="h-13 rounded-2xl border border-[#0f766e]/18 text-sm font-semibold text-[#52746d] transition hover:bg-[#0f766e]/6"
          disabled={isSaving}
          onClick={onStartOver}
          type="button"
        >
          {String(t.startOver)}
        </button>
        {!isFull ? (
          <button
            className="h-13 rounded-2xl bg-[#0f766e] text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#115e59] hover:shadow-lg hover:shadow-[#0f766e]/18 disabled:bg-[#0f766e]/40"
            disabled={isSaving}
            onClick={onUnlock}
            type="button"
          >
            {isSaving ? String(t.unlocking) : String(t.unlock)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#0f766e]/10 bg-white/70 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52746d]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[#12312c]">{value}</p>
    </div>
  );
}

function ScenarioCell({
  calories,
  label,
  language,
  targetDate,
  weeks,
}: {
  calories: number;
  label: string;
  language: Language;
  targetDate: string | null;
  weeks: number | null;
}) {
  const t = copy[language];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#52746d]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[#12312c]">
        {weeks === null ? String(t.impossible) : `${weeks} ${String(t.weeks)}`}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#52746d]">
        {calories} kcal/day
        {targetDate ? ` · ${targetDate}` : ""}
      </p>
    </div>
  );
}
