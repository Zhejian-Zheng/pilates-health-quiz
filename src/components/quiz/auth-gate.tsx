import { useState } from "react";
import type { FormEvent } from "react";

import { copy } from "@/lib/quiz-content";
import type { AuthMode, Language } from "@/lib/quiz-types";

type AuthFormMode = Exclude<AuthMode, "guest">;

export function AuthGate({
  error,
  language,
  onContinueAsGuest,
  onSubmitAuth,
  showGuestOption = true,
}: {
  error: string | null;
  language: Language;
  onContinueAsGuest: () => void;
  onSubmitAuth: (
    mode: AuthFormMode,
    credentials: { displayName?: string; email: string; password: string },
  ) => void | Promise<void>;
  showGuestOption?: boolean;
}) {
  const t = copy[language];
  const [mode, setMode] = useState<AuthFormMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitAuth(mode, { displayName, email, password });
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8 py-10 sm:py-14">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
          {String(t.authEyebrow)}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em] text-[#12312c] sm:text-5xl">
          {String(t.authTitle)}
        </h1>
      </div>

      <div
        className={
          showGuestOption
            ? "grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]"
            : "grid gap-5"
        }
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="flex w-fit gap-1 rounded-full bg-[#dcefe9] p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === item
                    ? "bg-[#0f766e] text-white shadow-sm shadow-[#0f766e]/16"
                    : "text-[#52746d] hover:text-[#12312c]"
                }`}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {item === "login" ? String(t.authLogin) : String(t.authRegister)}
              </button>
            ))}
          </div>

          {mode === "register" ? (
            <label className="grid gap-2 text-sm font-semibold text-[#52746d]">
              {String(t.authName)}
              <input
                className="h-13 rounded-2xl border border-[#0f766e]/14 bg-white/78 px-4 text-base text-[#12312c] outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/10"
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold text-[#52746d]">
            {String(t.authEmail)}
            <input
              className="h-13 rounded-2xl border border-[#0f766e]/14 bg-white/78 px-4 text-base text-[#12312c] outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/10"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#52746d]">
            {mode === "register"
              ? String(t.authPasswordRequirement)
              : String(t.authPassword)}
            <input
              className="h-13 rounded-2xl border border-[#0f766e]/14 bg-white/78 px-4 text-base text-[#12312c] outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/10"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="border-l-2 border-[#dc2626] bg-[#fee2e2]/60 px-4 py-3 text-sm font-medium text-[#991b1b]">
              {error}
            </p>
          ) : null}

          <button
            className="h-13 rounded-2xl bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#115e59] hover:shadow-lg hover:shadow-[#0f766e]/18"
            type="submit"
          >
            {mode === "login"
              ? String(t.authSubmitLogin)
              : String(t.authSubmitRegister)}
          </button>
        </form>

        {showGuestOption ? (
          <div className="border-t border-[#0f766e]/12 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <button
              className="h-13 w-full rounded-2xl border border-[#0f766e]/18 bg-white/72 px-5 text-sm font-semibold text-[#115e59] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-[#0f766e]/8"
              onClick={onContinueAsGuest}
              type="button"
            >
              {String(t.authGuest)}
            </button>
            <p className="mt-3 text-sm leading-6 text-[#52746d]">
              {String(t.authGuestNote)}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
