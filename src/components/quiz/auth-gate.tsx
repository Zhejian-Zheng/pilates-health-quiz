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
}: {
  error: string | null;
  language: Language;
  onContinueAsGuest: () => void;
  onSubmitAuth: (
    mode: AuthFormMode,
    credentials: { displayName?: string; email: string; password: string },
  ) => void;
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
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3c8786]">
          {String(t.authEyebrow)}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em] text-[#171717] sm:text-5xl">
          {String(t.authTitle)}
        </h1>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="flex w-fit gap-1 rounded-full bg-black/[0.04] p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === item
                    ? "bg-[#171717] text-white shadow-sm shadow-black/10"
                    : "text-black/48 hover:text-black"
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
            <label className="grid gap-2 text-sm font-semibold text-black/58">
              {String(t.authName)}
              <input
                className="h-13 rounded-2xl border border-black/12 bg-white/72 px-4 text-base text-[#171717] outline-none transition focus:border-[#3c8786] focus:ring-4 focus:ring-[#3c8786]/10"
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold text-black/58">
            {String(t.authEmail)}
            <input
              className="h-13 rounded-2xl border border-black/12 bg-white/72 px-4 text-base text-[#171717] outline-none transition focus:border-[#3c8786] focus:ring-4 focus:ring-[#3c8786]/10"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-black/58">
            {String(t.authPassword)}
            <input
              className="h-13 rounded-2xl border border-black/12 bg-white/72 px-4 text-base text-[#171717] outline-none transition focus:border-[#3c8786] focus:ring-4 focus:ring-[#3c8786]/10"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="border-l-2 border-[#ee505a] bg-[#ee505a]/8 px-4 py-3 text-sm font-medium text-[#a12630]">
              {error}
            </p>
          ) : null}

          <button
            className="h-13 rounded-2xl bg-[#171717] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/14"
            type="submit"
          >
            {mode === "login"
              ? String(t.authSubmitLogin)
              : String(t.authSubmitRegister)}
          </button>
        </form>

        <div className="border-t border-black/8 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <button
            className="h-13 w-full rounded-2xl border border-black/12 bg-white/62 px-5 text-sm font-semibold text-black/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-black/8"
            onClick={onContinueAsGuest}
            type="button"
          >
            {String(t.authGuest)}
          </button>
          <p className="mt-3 text-sm leading-6 text-black/48">
            {String(t.authGuestNote)}
          </p>
        </div>
      </div>
    </section>
  );
}
