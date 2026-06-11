"use client";

import { useEffect, useRef, useState } from "react";

import {
  copy,
  LANGUAGE_STORAGE_KEY,
  questions,
  SESSION_STORAGE_KEY,
} from "@/lib/quiz-content";
import type {
  AnswerValue,
  Language,
  Question,
  ResultResponse,
  SessionProgress,
  SyncStatus,
} from "@/lib/quiz-types";

export function useQuizFlow() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === "zh" ? "zh" : "en";
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
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const pendingSavesRef = useRef<Promise<boolean>[]>([]);
  const pendingSaveCountRef = useRef(0);
  const saveFailureRef = useRef(false);

  const t = copy[language];
  const currentQuestion = questions[currentStep];
  const answeredQuestionCount = questions.filter(
    (question) => answers[question.key] !== undefined,
  ).length;
  const visualProgress = result
    ? 100
    : Math.round((answeredQuestionCount / questions.length) * 100);
  const remainingQuestionCount = questions.length - answeredQuestionCount;
  const highestAnsweredStep = questions.reduce(
    (highestStep, question, index) =>
      answers[question.key] === undefined
        ? highestStep
        : Math.max(highestStep, index + 1),
    0,
  );
  const reachableStep = Math.min(
    questions.length,
    Math.max(currentStep, highestAnsweredStep),
  );

  useEffect(() => {
    async function restoreProgress() {
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

      if (!storedSessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/sessions/${storedSessionId}`);

        if (!response.ok) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        const progress = (await response.json()) as SessionProgress;
        const restoredAnswers = Object.fromEntries(
          progress.answers.map((answer) => [answer.questionKey, answer.value]),
        ) as Record<string, AnswerValue>;

        setSessionId(progress.sessionId);
        setAnswers(restoredAnswers);
        setCurrentStep(Math.min(progress.currentStep, questions.length));

        if (progress.status === "COMPLETED") {
          const resultResponse = await fetch(`/api/results/${progress.sessionId}`);

          if (resultResponse.ok) {
            setResult((await resultResponse.json()) as ResultResponse);
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
  }, []);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  async function ensureSession() {
    if (sessionId) {
      return sessionId;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = (async () => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flowId: "2117" }),
      });

      if (!response.ok) {
        throw new Error(String(t.createError));
      }

      const progress = (await response.json()) as SessionProgress;
      localStorage.setItem(SESSION_STORAGE_KEY, progress.sessionId);
      setSessionId(progress.sessionId);
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

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [question.key]: value,
    }));
    setCurrentStep(nextStep);

    const savePromise = persistAnswer(question, value, nextStep);
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
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? String(t.completeError));
      }

      await fetchResult(activeSessionId);
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

  async function fetchResult(activeSessionId: string) {
    const response = await fetch(`/api/results/${activeSessionId}`);

    if (!response.ok) {
      throw new Error(String(t.resultError));
    }

    setResult((await response.json()) as ResultResponse);
    setCurrentStep(questions.length);
  }

  async function unlockResult() {
    if (!sessionId) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          payload: {
            source: "demo-paywall",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(String(t.paymentError));
      }

      await fetchResult(sessionId);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error ? paymentError.message : String(t.paymentError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function startOver() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionPromiseRef.current = null;
    pendingSavesRef.current = [];
    pendingSaveCountRef.current = 0;
    saveFailureRef.current = false;
    setSessionId(null);
    setCurrentStep(0);
    setAnswers({});
    setNumberDrafts({});
    setResult(null);
    setSyncStatus("idle");
    setPendingSaveCount(0);
    setError(null);
  }

  return {
    actions: {
      changeLanguage,
      completeAssessment,
      goBack,
      goNext,
      goToStep,
      saveAnswer,
      setNumberDrafts,
      startOver,
      submitNumberAnswer,
      unlockResult,
    },
    state: {
      answers,
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
