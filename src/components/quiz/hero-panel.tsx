import { copy } from "@/lib/quiz-content";
import type { Language } from "@/lib/quiz-types";

export function HeroPanel({
  language,
  onHome,
  onLanguageChange,
}: {
  language: Language;
  onHome?: () => void;
  onLanguageChange: (language: Language) => void;
}) {
  const t = copy[language];

  return (
    <header className="border-b border-black/8 px-1 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#171717] text-sm font-semibold text-white shadow-sm shadow-black/10">
              P
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#171717] sm:text-base">
                {String(t.brandEyebrow)}
              </p>
              <p className="mt-1 hidden text-xs font-medium text-black/42 md:block">
                {String(t.heroBadge)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onHome ? (
            <button
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-black/48 transition hover:bg-black/[0.04] hover:text-black"
              onClick={onHome}
              type="button"
            >
              {String(t.returnHome)}
            </button>
          ) : null}

          <div className="flex items-center gap-2 rounded-full bg-black/[0.04] p-1 shadow-inner shadow-black/5">
            {(["en", "zh"] as const).map((item) => (
              <button
                aria-label={`${String(t.language)} ${item}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === item
                    ? "bg-[#171717] text-white shadow-sm"
                    : "text-black/45 hover:text-black"
                }`}
                key={item}
                onClick={() => onLanguageChange(item)}
                type="button"
              >
                {item === "en" ? "EN" : "中文"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
