"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AUTH_STORAGE_KEY,
  copy,
  LANGUAGE_STORAGE_KEY,
  questions,
} from "@/lib/quiz-content";
import type {
  AnswerValue,
  AuthMode,
  AuthProfile,
  Language,
  Question,
  ResultResponse,
  SessionProgress,
  SyncStatus,
} from "@/lib/quiz-types";

type AuthResponse = {
  profile: AuthProfile;
  progress: SessionProgress;
};

export function useQuizFlow() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === "zh" ? "zh" : "en";
  });
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return readStoredAuthProfile();
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const pendingSavesRef = useRef<Promise<boolean>[]>([]);
  const pendingSaveCountRef = useRef(0);
  const saveFailureRef = useRef(false);
  const highestPersistedStepRef = useRef(0);

  const t = copy[language];
  const currentQuestion = questions[currentStep];
  const answeredQuestionCount = questions.filter(
    (question) => answers[question.key] !== undefined,
  ).length;
  const visualProgress = result
    ? 100
    : Math.round((answeredQuestionCount / questions.length) * 100);
  const remainingQuestionCount = questions.length - answeredQuestionCount;
  const reachableStep = getReachableStep(answers, currentStep);

  const setActiveSessionId = useCallback((nextSessionId: string | null) => {
    sessionIdRef.current = nextSessionId;
    setSessionId(nextSessionId);
  }, []);

  const applyProgress = useCallback((progress: SessionProgress) => {
    const restoredAnswers = Object.fromEntries(
      progress.answers.map((answer) => [answer.questionKey, answer.value]),
    ) as Record<string, AnswerValue>;
    const restoredStep = Math.min(progress.currentStep, questions.length);

    setActiveSessionId(progress.sessionId);
    setAnswers(restoredAnswers);
    highestPersistedStepRef.current = restoredStep;
    setCurrentStep(restoredStep);
  }, [setActiveSessionId]);

  useEffect(() => {
    async function restoreProgress() {
      try {
        const response = await fetch("/api/sessions/current", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const progress = (await response.json()) as SessionProgress;

        if (!readStoredAuthProfile()) {
          const restoredProfile = progress.authProfile ?? getGuestProfile();
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(restoredProfile));
          setAuthProfile(restoredProfile);
        }

        applyProgress(progress);

        if (progress.status === "COMPLETED") {
          const resultResponse = await fetch("/api/results/current", {
            credentials: "same-origin",
          });

          if (resultResponse.ok) {
            setResult((await resultResponse.json()) as ResultResponse);
            highestPersistedStepRef.current = questions.length;
            setCurrentStep(questions.length);
          }
        }
      } catch {
        setError(String(copy.en.restoreError));
      } finally {
        setIsLoading(false);
      }
    }

    restoreProgress();
  }, [applyProgress]);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  function continueAsGuest() {
    const guestProfile = getGuestProfile();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestProfile));
    setAuthProfile(guestProfile);
    setError(null);
  }

  async function submitAuth(
    mode: Exclude<AuthMode, "guest">,
    credentials: { displayName?: string; email: string; password: string },
  ) {
    const email = credentials.email.trim();

    if (!email.includes("@") || credentials.password.length < 6) {
      setError(String(t.authInvalid));
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: credentials.displayName,
          email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error(getAuthErrorMessage(response.status, mode));
      }

      const auth = (await response.json()) as AuthResponse;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth.profile));
      setAuthProfile(auth.profile);
      setResult(null);
      applyProgress(auth.progress);
      if (auth.progress.status === "COMPLETED") {
        await fetchResult();
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(t.authInvalid));
    }
  }

  function returnHome() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthProfile(null);
    setError(null);
  }

  function logout() {
    void fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    returnHome();
    sessionPromiseRef.current = null;
    setActiveSessionId(null);
    setAnswers({});
    setNumberDrafts({});
    setResult(null);
    setCurrentStep(0);
    highestPersistedStepRef.current = 0;
  }

  async function ensureSession() {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = (async () => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flowId: "2117" }),
      });

      if (!response.ok) {
        throw new Error(String(t.createError));
      }

      const progress = (await response.json()) as SessionProgress;
      setActiveSessionId(progress.sessionId);
      highestPersistedStepRef.current = Math.min(
        Math.max(highestPersistedStepRef.current, progress.currentStep),
        questions.length,
      );
      return progress.sessionId;
    })().finally(() => {
      sessionPromiseRef.current = null;
    });

    return sessionPromiseRef.current;
  }

  function saveAnswer(question: Question, value: AnswerValue) {
    setError(null);
    saveFailureRef.current = false;
    const questionIndex = questions.findIndex((item) => item.key === question.key);
    const nextStep = Math.min(
      Math.max(currentStep, questionIndex + 1),
      questions.length,
    );
    const persistedStep = Math.min(
      Math.max(highestPersistedStepRef.current, nextStep),
      questions.length,
    );
    highestPersistedStepRef.current = persistedStep;

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [question.key]: value,
    }));
    setCurrentStep(nextStep);

    const precedingSaves = [...pendingSavesRef.current];
    const savePromise = Promise.allSettled(precedingSaves).then(() =>
      persistAnswer(question, value, persistedStep),
    );
    trackPendingSave(savePromise);
  }

  async function persistAnswer(
    question: Question,
    value: AnswerValue,
    nextStep: number,
  ) {
    try {
      const activeSessionId = await ensureSession();
      const response = await fetch(`/api/sessions/${activeSessionId}/answers`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentStep: nextStep,
          answers: [
            {
              stepKey: question.key,
              questionKey: question.key,
              value,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(String(t.saveError));
      }

      const progress = (await response.json()) as SessionProgress;
      highestPersistedStepRef.current = Math.min(
        Math.max(highestPersistedStepRef.current, progress.currentStep),
        questions.length,
      );
      return true;
    } catch (saveError) {
      saveFailureRef.current = true;
      setError(saveError instanceof Error ? saveError.message : String(t.saveError));
      setSyncStatus("error");
      return false;
    }
  }

  function trackPendingSave(savePromise: Promise<boolean>) {
    pendingSaveCountRef.current += 1;
    pendingSavesRef.current = [...pendingSavesRef.current, savePromise];
    setPendingSaveCount(pendingSaveCountRef.current);
    setSyncStatus("syncing");

    savePromise.finally(() => {
      pendingSavesRef.current = pendingSavesRef.current.filter(
        (pendingSave) => pendingSave !== savePromise,
      );
      pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
      setPendingSaveCount(pendingSaveCountRef.current);

      if (pendingSaveCountRef.current === 0) {
        setSyncStatus(saveFailureRef.current ? "error" : "saved");
      }
    });
  }

  async function waitForPendingSaves() {
    while (pendingSavesRef.current.length > 0) {
      await Promise.all(pendingSavesRef.current);
    }
  }

  function submitNumberAnswer() {
    if (!currentQuestion || currentQuestion.type !== "number") {
      return;
    }

    const value = Number(
      numberDrafts[currentQuestion.key] ?? answers[currentQuestion.key] ?? "",
    );

    if (
      !Number.isFinite(value) ||
      value < currentQuestion.min ||
      value > currentQuestion.max
    ) {
      setError(String(t.rangeError(currentQuestion.min, currentQuestion.max)));
      return;
    }

    saveAnswer(currentQuestion, value);
  }

  function goToStep(step: number) {
    if (step < 0 || step > questions.length) {
      return;
    }

    if (step > reachableStep) {
      setError(String(t.jumpLocked));
      return;
    }

    setResult(null);
    setError(null);
    setCurrentStep(step);
  }

  function goBack() {
    goToStep(Math.max(0, currentStep - 1));
  }

  function goNext() {
    const nextStep = Math.min(currentStep + 1, questions.length);

    if (nextStep > reachableStep) {
      setError(String(t.missingAnswer));
      return;
    }

    goToStep(nextStep);
  }

  async function completeAssessment() {
    const requiredKeys = [
      "gender",
      "goal",
      "activityLevel",
      "heightCm",
      "currentWeightKg",
      "targetWeightKg",
      "age",
    ];
    const missingKey = requiredKeys.find((key) => answers[key] === undefined);

    if (missingKey) {
      setCurrentStep(questions.findIndex((question) => question.key === missingKey));
      setError(String(t.missingAnswer));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await waitForPendingSaves();

      if (saveFailureRef.current) {
        throw new Error(String(t.saveError));
      }

      const activeSessionId = sessionId ?? (await ensureSession());
      const response = await fetch(`/api/sessions/${activeSessionId}/complete`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? String(t.completeError));
      }

      await fetchResult();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : String(t.completeError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function fetchResult() {
    const response = await fetch("/api/results/current", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(String(t.resultError));
    }

    setResult((await response.json()) as ResultResponse);
    setCurrentStep(questions.length);
  }

  async function unlockResult() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            source: "demo-paywall",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(String(t.paymentError));
      }

      await fetchResult();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error ? paymentError.message : String(t.paymentError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function upgradeMembership() {
    setIsSaving(true);
    setError(null);

    try {
      if (!sessionId) {
        await ensureSession();
      }

      const response = await fetch("/api/pay", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            source: "account-settings",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(String(t.paymentError));
      }

      if (result) {
        await fetchResult();
      } else {
        setSyncStatus("saved");
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error ? paymentError.message : String(t.paymentError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function startOver() {
    void fetch("/api/sessions/current", {
      method: "DELETE",
      credentials: "same-origin",
    });
    sessionPromiseRef.current = null;
    pendingSavesRef.current = [];
    pendingSaveCountRef.current = 0;
    saveFailureRef.current = false;
    highestPersistedStepRef.current = 0;
    setActiveSessionId(null);
    setCurrentStep(0);
    setAnswers({});
    setNumberDrafts({});
    setResult(null);
    setSyncStatus("idle");
    setPendingSaveCount(0);
    setError(null);
  }

  function getAuthErrorMessage(
    status: number,
    mode: Exclude<AuthMode, "guest">,
  ) {
    if (status === 409 && mode === "register") {
      return String(t.authAccountExists);
    }

    if (status === 401 && mode === "login") {
      return String(t.authInvalidCredentials);
    }

    if (status === 400) {
      return String(t.authInvalid);
    }

    return String(t.authServerError);
  }

  return {
    actions: {
      changeLanguage,
      clearError: () => setError(null),
      completeAssessment,
      continueAsGuest,
      goBack,
      goNext,
      goToStep,
      logout,
      returnHome,
      saveAnswer,
      setNumberDrafts,
      startOver,
      submitAuth,
      submitNumberAnswer,
      unlockResult,
      upgradeMembership,
    },
    state: {
      answers,
      authProfile,
      currentQuestion,
      currentStep,
      error,
      isLoading,
      isSaving,
      language,
      numberDrafts,
      pendingSaveCount,
      reachableStep,
      remainingQuestionCount,
      result,
      sessionId,
      syncStatus,
      visualProgress,
    },
  };
}

function readStoredAuthProfile() {
  const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedAuth) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedAuth) as Partial<AuthProfile>;

    if (
      (parsed.mode === "guest" ||
        parsed.mode === "login" ||
        parsed.mode === "register") &&
      typeof parsed.displayName === "string"
    ) {
      return parsed as AuthProfile;
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return null;
}

function getGuestProfile(): AuthProfile {
  return {
    mode: "guest",
    displayName: "Guest",
  };
}

function getReachableStep(
  answers: Record<string, AnswerValue>,
  currentStep: number,
) {
  let reachableStep = 0;

  for (const [index, question] of questions.entries()) {
    if (answers[question.key] !== undefined || question.optional) {
      reachableStep = index + 1;
      continue;
    }

    break;
  }

  return Math.min(questions.length, Math.max(currentStep, reachableStep));
}
