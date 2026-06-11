"use client";

import { useEffect, useRef, useState } from "react";

import { copy } from "@/lib/quiz-content";
import type { AuthProfile, Language } from "@/lib/quiz-types";

export function HeroPanel({
  authProfile,
  language,
  onLanguageChange,
  onLoginRequest,
  onLogout,
  onReturnHome,
  onUpgradeMembership,
}: {
  authProfile?: AuthProfile | null;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onLoginRequest?: () => void;
  onLogout?: () => void;
  onReturnHome?: () => void;
  onUpgradeMembership?: () => void;
}) {
  const t = copy[language];
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const displayName =
    authProfile?.mode === "guest"
      ? String(t.accountGuest)
      : authProfile?.displayName || "";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function runMenuAction(action?: () => void) {
    setIsSettingsOpen(false);
    action?.();
  }

  return (
    <header className="border-b border-[#0f766e]/12 px-1 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-sm font-semibold text-white shadow-sm shadow-[#0f766e]/20">
              P
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#12312c] sm:text-base">
                {String(t.brandEyebrow)}
              </p>
              <p className="mt-1 hidden text-xs font-medium text-[#52746d] md:block">
                {String(t.heroBadge)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {authProfile ? (
            <div className="relative" ref={settingsRef}>
              <button
                aria-expanded={isSettingsOpen}
                className="flex max-w-[180px] items-center gap-2 rounded-full border border-[#0f766e]/12 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#12312c] shadow-sm shadow-[#0f766e]/6 transition hover:border-[#0f766e]/24 hover:bg-white"
                onClick={() => setIsSettingsOpen((current) => !current)}
                type="button"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#0f766e]" />
                <span className="truncate">{displayName}</span>
                <span className="text-[#52746d]">{String(t.settings)}</span>
              </button>

              {isSettingsOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 grid min-w-44 gap-1 rounded-2xl border border-[#0f766e]/12 bg-white/95 p-2 text-sm font-semibold text-[#12312c] shadow-xl shadow-[#0f766e]/12 backdrop-blur">
                  {authProfile.mode === "guest" ? (
                    <>
                      <button
                        className="rounded-xl px-3 py-2 text-left transition hover:bg-[#e6f5f0] hover:text-[#115e59]"
                        onClick={() => runMenuAction(onReturnHome)}
                        type="button"
                      >
                        {String(t.returnHome)}
                      </button>
                      <button
                        className="rounded-xl px-3 py-2 text-left transition hover:bg-[#e6f5f0] hover:text-[#115e59]"
                        onClick={() => runMenuAction(onLoginRequest)}
                        type="button"
                      >
                        {String(t.signIn)}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="rounded-xl px-3 py-2 text-left transition hover:bg-[#e6f5f0] hover:text-[#115e59]"
                        onClick={() => runMenuAction(onUpgradeMembership)}
                        type="button"
                      >
                        {String(t.upgradeMembership)}
                      </button>
                      <button
                        className="rounded-xl px-3 py-2 text-left text-[#b42318] transition hover:bg-[#fee2e2]/70"
                        onClick={() => runMenuAction(onLogout)}
                        type="button"
                      >
                        {String(t.logout)}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-full bg-[#dcefe9] p-1 shadow-inner shadow-[#0f766e]/5">
            {(["en", "zh"] as const).map((item) => (
              <button
                aria-label={`${String(t.language)} ${item}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === item
                    ? "bg-[#0f766e] text-white shadow-sm"
                    : "text-[#52746d] hover:text-[#12312c]"
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
