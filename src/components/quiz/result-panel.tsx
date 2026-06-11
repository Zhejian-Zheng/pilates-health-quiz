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

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3c8786]">
        {isFull ? String(t.planUnlocked) : String(t.profilePreview)}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight">
        {isFull ? String(t.unlockedTitle) : String(t.lockedTitle)}
      </h2>
      <p className="mt-4 text-base leading-7 text-black/62">
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
        <div className="mt-7 rounded-3xl bg-[#f4f3ef] p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">{String(t.reportTitle)}</h3>
              <p className="mt-1 text-xs text-black/45">
                {result.result.detailedRecommendation.report.formula} · 7700 kcal/kg
              </p>
            </div>
            <p className="text-xs font-medium text-black/45">
              {language === "zh" ? "目标差值" : "Target delta"}{" "}
              {result.result.detailedRecommendation.report.targetWeightDeltaKg} kg
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            {result.result.detailedRecommendation.report.scenarios.map(
              (scenario) => (
                <div
                  className="grid gap-3 rounded-2xl bg-white/72 px-4 py-3 text-sm sm:grid-cols-[1.1fr_0.9fr_0.9fr]"
                  key={scenario.activityLevel}
                >
                  <div>
                    <p className="font-semibold">
                      {translateActivityLabel(scenario.activityLevel, language)}
                    </p>
                    <p className="mt-1 text-xs text-black/45">
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
        <div className="mt-7 rounded-3xl bg-[#f4f3ef] p-5">
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
                    className="w-full rounded-t-md bg-[#3c8786] transition-all duration-700"
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
        <div className="mt-7 rounded-3xl border border-[#3c8786]/20 bg-[#e9f4f2] p-5">
          <h3 className="text-sm font-semibold text-[#205c5a]">
            {String(t.fullPlanLocked)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-black/62">
            {String(t.defaultPaywall)}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          className="h-13 rounded-2xl border border-black/12 text-sm font-semibold text-black/62 transition hover:bg-black/[0.03]"
          disabled={isSaving}
          onClick={onStartOver}
          type="button"
        >
          {String(t.startOver)}
        </button>
        {!isFull ? (
          <button
            className="h-13 rounded-2xl bg-[#171717] text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/18 disabled:bg-black/40"
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
    <div className="rounded-2xl bg-[#f4f3ef] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/38">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
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
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/38">
        {label}
      </p>
      <p className="mt-1 font-semibold">
        {weeks === null ? String(t.impossible) : `${weeks} ${String(t.weeks)}`}
      </p>
      <p className="mt-1 text-xs leading-5 text-black/45">
        {calories} kcal/day
        {targetDate ? ` · ${targetDate}` : ""}
      </p>
    </div>
  );
}
