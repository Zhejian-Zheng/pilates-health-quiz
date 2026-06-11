import { copy } from "@/lib/quiz-content";
import type { AnswerValue, Language } from "@/lib/quiz-types";

export function HeroPanel({
  answers,
  language,
  remainingQuestionCount,
  sessionId,
}: {
  answers: Record<string, AnswerValue>;
  language: Language;
  remainingQuestionCount: number;
  sessionId: string | null;
}) {
  const t = copy[language];

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[#171717] text-white shadow-xl shadow-black/15">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center opacity-50 motion-safe:animate-[image-drift_18s_ease-in-out_infinite_alternate]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=85')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,23,23,0.94)_0%,rgba(23,23,23,0.74)_48%,rgba(23,23,23,0.38)_100%)]" />
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-xs font-medium text-white/84 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#8be0c5]" />
            {String(t.heroBadge)}
          </div>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            {String(t.brandEyebrow)}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
            {String(t.heroTitle)}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
            {String(t.heroSub)}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-white/78 sm:grid-cols-3 lg:grid-cols-1">
          <HeroMetric label={String(t.savedAnswers)} value={Object.keys(answers).length} />
          <HeroMetric label={String(t.remaining)} value={remainingQuestionCount} />
          <HeroMetric
            label={String(t.session)}
            value={sessionId ? `${sessionId.slice(0, 6)}...` : String(t.notStarted)}
          />
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
