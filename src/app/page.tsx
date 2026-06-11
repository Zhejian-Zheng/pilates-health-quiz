"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Language = "en" | "zh";
type AnswerValue = string | number;
type SyncStatus = "idle" | "syncing" | "saved" | "error";

type Question =
  | {
      key: string;
      title: Record<Language, string>;
      helper?: Record<Language, string>;
      type: "single";
      options: { label: Record<Language, string>; value: string }[];
    }
  | {
      key: string;
      title: Record<Language, string>;
      helper?: Record<Language, string>;
      type: "number";
      suffix: Record<Language, string>;
      min: number;
      max: number;
      placeholder: string;
    };

type ProgressAnswer = {
  questionKey: string;
  value: AnswerValue;
};

type SessionProgress = {
  sessionId: string;
  currentStep: number;
  status: string;
  subscriptionStatus: string;
  answers: ProgressAnswer[];
};

type ResultResponse = {
  sessionId: string;
  access: "LOCKED" | "FULL";
  subscriptionStatus: string;
  result: {
    bmi: number;
    bmiCategory: string;
    summary: string;
    recommendedCalories?: number;
    targetDate?: string;
    detailedRecommendation?: {
      bmr: number;
      tdee: number;
      dailyCalories: number;
      weeklyWeightChangeKg: number;
      planFocus: string[];
      report?: {
        formula: string;
        bmr: number;
        selectedTdee: number;
        targetWeightDeltaKg: number;
        scenarios: {
          activityLevel: string;
          activityLabel: string;
          activityFactor: number;
          tdee: number;
          mildDeficitCalories: number;
          standardDeficitCalories: number;
          mildDailyCalories: number;
          standardDailyCalories: number;
          mildWeeksToTarget: number | null;
          standardWeeksToTarget: number | null;
          mildTargetDate: string | null;
          standardTargetDate: string | null;
        }[];
        notes: string[];
      };
    };
    projectionCurve?: { week: number; date: string; weightKg: number }[];
    paywall?: {
      message: string;
      protectedFields: string[];
    };
  };
};

const SESSION_STORAGE_KEY = "pilates-health-quiz-session-id";
const LANGUAGE_STORAGE_KEY = "pilates-health-quiz-language";

const copy = {
  en: {
    loading: "Loading your quiz...",
    brandEyebrow: "Pilates Health Quiz",
    heroTitle: "A calmer way into a stronger body.",
    heroSub:
      "Answer a few focused questions and unlock a beginner Pilates plan shaped around your current body, goal, and rhythm.",
    heroBadge: "Personalized in under a minute",
    language: "Language",
    savedAnswers: "Saved answers",
    requiredFields: "Health fields",
    session: "Session",
    notStarted: "not started",
    quizLabel: "1-minute quiz",
    selected: "Selected",
    choose: "Choose",
    continue: "Continue",
    back: "Back",
    saved: "Saved",
    syncIdle: "Saved locally after each answer",
    syncing: "Syncing in background...",
    synced: "Synced",
    syncError: "Saved locally. Sync needs retry.",
    finishingSync: "Finishing sync...",
    result: "Result",
    step: "Step",
    rangeError: (min: number, max: number) =>
      `Enter a value between ${min} and ${max}.`,
    restoreError: "We could not restore your previous quiz.",
    createError: "Could not create your quiz session.",
    saveError: "Could not save your answer.",
    missingAnswer: "Please complete the remaining questions first.",
    completeError: "Could not complete the quiz.",
    resultError: "Could not load your result.",
    paymentError: "Payment simulation failed.",
    reviewEyebrow: "Profile ready",
    reviewTitle: "Your wellness profile is ready to calculate.",
    editAnswers: "Edit answers",
    seeResult: "See my result",
    calculating: "Calculating...",
    planUnlocked: "Plan unlocked",
    profilePreview: "Wellness profile",
    unlockedTitle: "Your beginner Pilates plan is unlocked.",
    lockedTitle: "Here is your preview.",
    bmi: "BMI",
    category: "Category",
    calories: "Daily calories",
    bmr: "BMR",
    tdee: "TDEE",
    targetDate: "Target date",
    projection: "Weight projection",
    reportTitle: "Fat-loss cycle report",
    mildCut: "Mild cut",
    standardCut: "Standard cut",
    weeks: "weeks",
    impossible: "Not recommended",
    fullPlanLocked: "Full plan locked",
    defaultPaywall: "Upgrade to unlock your full Pilates plan.",
    startOver: "Start over",
    unlock: "Unlock full plan",
    unlocking: "Unlocking...",
    healthSnapshot: "Health snapshot",
  },
  zh: {
    loading: "正在载入你的测评...",
    brandEyebrow: "普拉提健康测评",
    heroTitle: "用更平静的方式，走向更强的身体。",
    heroSub:
      "回答几个关键问题，生成一份基于当前身体状态、目标和运动节奏的初学者普拉提计划。",
    heroBadge: "1 分钟内生成个性化计划",
    language: "语言",
    savedAnswers: "已保存答案",
    requiredFields: "健康字段",
    session: "会话",
    notStarted: "尚未开始",
    quizLabel: "1 分钟测评",
    selected: "已选择",
    choose: "选择",
    continue: "继续",
    back: "返回",
    saved: "已保存",
    syncIdle: "每题都会先保存到本地",
    syncing: "后台同步中...",
    synced: "已同步",
    syncError: "已本地保存，同步需重试",
    finishingSync: "正在完成同步...",
    result: "结果",
    step: "第",
    rangeError: (min: number, max: number) => `请输入 ${min} 到 ${max} 之间的数值。`,
    restoreError: "无法恢复上次测评进度。",
    createError: "无法创建测评会话。",
    saveError: "无法保存你的答案。",
    missingAnswer: "请先完成剩余问题。",
    completeError: "无法完成测评。",
    resultError: "无法载入你的结果。",
    paymentError: "模拟支付失败。",
    reviewEyebrow: "档案已准备好",
    reviewTitle: "你的健康档案已经可以计算。",
    editAnswers: "修改答案",
    seeResult: "查看结果",
    calculating: "计算中...",
    planUnlocked: "计划已解锁",
    profilePreview: "健康档案",
    unlockedTitle: "你的初学者普拉提计划已解锁。",
    lockedTitle: "这是你的测评预览。",
    bmi: "BMI",
    category: "分类",
    calories: "每日热量",
    bmr: "基础代谢 BMR",
    tdee: "总消耗 TDEE",
    targetDate: "目标日期",
    projection: "体重预测",
    reportTitle: "减脂周期报告",
    mildCut: "温和减脂",
    standardCut: "标准减脂",
    weeks: "周",
    impossible: "不建议",
    fullPlanLocked: "完整计划已锁定",
    defaultPaywall: "解锁后可查看完整普拉提计划。",
    startOver: "重新开始",
    unlock: "解锁完整计划",
    unlocking: "解锁中...",
    healthSnapshot: "健康概览",
  },
} satisfies Record<Language, Record<string, string | ((min: number, max: number) => string)>>;

const answerLabels: Record<string, Record<Language, string>> = {
  "18-29": { en: "18-29", zh: "18-29 岁" },
  "30-39": { en: "30-39", zh: "30-39 岁" },
  "40-49": { en: "40-49", zh: "40-49 岁" },
  "50+": { en: "50+", zh: "50 岁以上" },
  female: { en: "Female", zh: "女性" },
  male: { en: "Male", zh: "男性" },
  other: { en: "Other", zh: "其他" },
  "Lose weight": { en: "Lose weight", zh: "减重" },
  "Increase muscle strength": { en: "Increase muscle strength", zh: "增强肌肉力量" },
  "Develop flexibility": { en: "Develop flexibility", zh: "提升柔韧性" },
  "Improve posture": { en: "Improve posture", zh: "改善体态" },
  sedentary: { en: "Never", zh: "几乎不运动" },
  light: { en: "Several times per month", zh: "每月几次" },
  moderate: { en: "Several times per week", zh: "每周几次" },
  active: { en: "Almost every day", zh: "几乎每天" },
};

const questions: Question[] = [
  {
    key: "ageRange",
    title: {
      en: "Select your age range to start",
      zh: "选择你的年龄段开始",
    },
    helper: {
      en: "Your plan begins with a short Pilates readiness check.",
      zh: "你的计划会从一个简短的普拉提准备度测评开始。",
    },
    type: "single",
    options: [
      { label: answerLabels["18-29"], value: "18-29" },
      { label: answerLabels["30-39"], value: "30-39" },
      { label: answerLabels["40-49"], value: "40-49" },
      { label: answerLabels["50+"], value: "50+" },
    ],
  },
  {
    key: "gender",
    title: {
      en: "Which option best describes you?",
      zh: "以下哪项更符合你？",
    },
    type: "single",
    options: [
      { label: answerLabels.female, value: "female" },
      { label: answerLabels.male, value: "male" },
      { label: answerLabels.other, value: "other" },
    ],
  },
  {
    key: "goal",
    title: {
      en: "What is your main goal?",
      zh: "你的主要目标是什么？",
    },
    type: "single",
    options: [
      { label: answerLabels["Lose weight"], value: "Lose weight" },
      {
        label: answerLabels["Increase muscle strength"],
        value: "Increase muscle strength",
      },
      { label: answerLabels["Develop flexibility"], value: "Develop flexibility" },
      { label: answerLabels["Improve posture"], value: "Improve posture" },
    ],
  },
  {
    key: "activityLevel",
    title: {
      en: "How often do you exercise?",
      zh: "你平时运动频率如何？",
    },
    type: "single",
    options: [
      { label: answerLabels.sedentary, value: "sedentary" },
      { label: answerLabels.light, value: "light" },
      { label: answerLabels.moderate, value: "moderate" },
      { label: answerLabels.active, value: "active" },
    ],
  },
  {
    key: "heightCm",
    title: {
      en: "How tall are you?",
      zh: "你的身高是多少？",
    },
    helper: {
      en: "Use centimeters for this version.",
      zh: "当前版本使用厘米作为单位。",
    },
    type: "number",
    suffix: { en: "cm", zh: "厘米" },
    min: 100,
    max: 250,
    placeholder: "165",
  },
  {
    key: "currentWeightKg",
    title: {
      en: "What is your current weight?",
      zh: "你现在的体重是多少？",
    },
    type: "number",
    suffix: { en: "kg", zh: "公斤" },
    min: 30,
    max: 300,
    placeholder: "80",
  },
  {
    key: "targetWeightKg",
    title: {
      en: "What is your goal weight?",
      zh: "你的目标体重是多少？",
    },
    helper: {
      en: "Choose a realistic target for a sustainable plan.",
      zh: "选择一个现实、可持续的目标。",
    },
    type: "number",
    suffix: { en: "kg", zh: "公斤" },
    min: 30,
    max: 300,
    placeholder: "70",
  },
  {
    key: "age",
    title: {
      en: "What is your exact age?",
      zh: "你的准确年龄是多少？",
    },
    type: "number",
    suffix: { en: "years", zh: "岁" },
    min: 13,
    max: 100,
    placeholder: "30",
  },
];

export default function Home() {
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
  const progressPercent = Math.round((currentStep / questions.length) * 100);
  const visualProgress = result ? 100 : progressPercent;

  const completedRequiredCount = useMemo(
    () =>
      [
        "gender",
        "goal",
        "activityLevel",
        "heightCm",
        "currentWeightKg",
        "targetWeightKg",
        "age",
      ].filter((key) => answers[key] !== undefined).length,
    [answers],
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
        setError(copy.en.restoreError);
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
    const nextStep = Math.min(currentStep + 1, questions.length);

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

  async function submitNumberAnswer() {
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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-6 text-[#171717]">
        <p className="animate-[page-fade_0.8s_ease_both] text-sm font-medium text-black/60">
          {String(t.loading)}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ef] text-[#171717]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(60,135,134,0.16),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(72,90,163,0.12),transparent_28%),linear-gradient(180deg,#f7f4ef_0%,#eef3f4_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <header className="glass-panel sticky top-4 z-20 flex items-center justify-between gap-4 rounded-full px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171717] text-sm font-semibold text-white">
              P
            </div>
            <span className="text-sm font-semibold">{String(t.brandEyebrow)}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/70 p-1 shadow-inner shadow-black/5">
            {(["en", "zh"] as Language[]).map((item) => (
              <button
                aria-label={`${String(t.language)} ${item}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === item
                    ? "bg-[#171717] text-white shadow-sm"
                    : "text-black/55 hover:text-black"
                }`}
                key={item}
                onClick={() => changeLanguage(item)}
                type="button"
              >
                {item === "en" ? "EN" : "中文"}
              </button>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1fr_1.04fr] lg:items-center">
          <aside className="relative min-h-[520px] overflow-hidden rounded-[28px] bg-[#171717] text-white shadow-2xl shadow-black/25">
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center motion-safe:animate-[image-drift_18s_ease-in-out_infinite_alternate]"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=85')",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,23,23,0.08)_0%,rgba(23,23,23,0.42)_45%,rgba(23,23,23,0.92)_100%)]" />
            <div className="relative flex min-h-[520px] flex-col justify-between p-6 sm:p-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-sm font-medium text-white/84 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#8be0c5]" />
                {String(t.heroBadge)}
              </div>

              <div className="animate-[page-rise_0.8s_ease_both]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/68">
                  {String(t.brandEyebrow)}
                </p>
                <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl">
                  {String(t.heroTitle)}
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-white/76 sm:text-lg">
                  {String(t.heroSub)}
                </p>
              </div>

              <div className="grid gap-3 text-sm text-white/78 sm:grid-cols-3">
                <HeroMetric label={String(t.savedAnswers)} value={Object.keys(answers).length} />
                <HeroMetric label={String(t.requiredFields)} value={`${completedRequiredCount}/7`} />
                <HeroMetric
                  label={String(t.session)}
                  value={sessionId ? `${sessionId.slice(0, 6)}...` : String(t.notStarted)}
                />
              </div>
            </div>
          </aside>

          <section className="animate-[page-rise_0.65s_ease_0.08s_both]">
            <div className="mb-5 flex items-center gap-5">
              <ProgressRing value={visualProgress} />
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-[#171717] transition-all duration-700 ease-out"
                    style={{ width: `${visualProgress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                  <span>
                    {result
                      ? String(t.result)
                      : language === "zh"
                        ? `${String(t.step)} ${currentStep + 1}`
                        : `${String(t.step)} ${currentStep + 1}`}
                  </span>
                  <span>{visualProgress}%</span>
                </div>
              </div>
            </div>

            <div className="glass-panel min-h-[520px] rounded-[28px] p-5 shadow-2xl shadow-black/10 sm:p-7">
              <div className="rounded-[22px] bg-white/78 p-6 shadow-sm shadow-black/5 backdrop-blur">
                {result ? (
                  <ResultPanel
                    isSaving={isSaving}
                    language={language}
                    onStartOver={startOver}
                    onUnlock={unlockResult}
                    result={result}
                  />
                ) : currentQuestion ? (
                  <QuestionPanel
                    answer={answers[currentQuestion.key]}
                    inputValue={
                      numberDrafts[currentQuestion.key] ??
                      String(answers[currentQuestion.key] ?? "")
                    }
                    isSaving={isSaving}
                    language={language}
                    onBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
                    onInputChange={(value) =>
                      setNumberDrafts((drafts) => ({
                        ...drafts,
                        [currentQuestion.key]: value,
                      }))
                    }
                    onNumberSubmit={submitNumberAnswer}
                    onSelect={(value) => saveAnswer(currentQuestion, value)}
                    question={currentQuestion}
                    syncStatus={syncStatus}
                  />
                ) : (
                  <ReviewPanel
                    answers={answers}
                    isSaving={isSaving}
                    language={language}
                    onBack={() => setCurrentStep(questions.length - 1)}
                    onComplete={completeAssessment}
                    pendingSaveCount={pendingSaveCount}
                  />
                )}

                {error ? (
                  <p className="mt-5 rounded-2xl border border-[#ee505a]/30 bg-[#ee505a]/10 px-4 py-3 text-sm font-medium text-[#a12630]">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const degrees = Math.round((value / 100) * 360);

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-sm shadow-black/10 transition-all duration-700"
      style={{
        background: `conic-gradient(#171717 ${degrees}deg, rgba(23,23,23,0.09) 0deg)`,
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f4ef] text-xs font-bold">
        {value}%
      </div>
    </div>
  );
}

function QuestionPanel({
  answer,
  inputValue,
  isSaving,
  language,
  onBack,
  onInputChange,
  onNumberSubmit,
  onSelect,
  question,
  syncStatus,
}: {
  answer: AnswerValue | undefined;
  inputValue: string;
  isSaving: boolean;
  language: Language;
  onBack: () => void;
  onInputChange: (value: string) => void;
  onNumberSubmit: () => void;
  onSelect: (value: string) => void;
  question: Question;
  syncStatus: SyncStatus;
}) {
  const t = copy[language];
  const syncText = {
    idle: String(t.syncIdle),
    syncing: String(t.syncing),
    saved: String(t.synced),
    error: String(t.syncError),
  }[syncStatus];

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3c8786]">
        {String(t.quizLabel)}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#171717]">
        {question.title[language]}
      </h2>
      {question.helper ? (
        <p className="mt-4 text-base leading-7 text-black/58">
          {question.helper[language]}
        </p>
      ) : null}

      {question.type === "single" ? (
        <div className="mt-9 grid gap-3">
          {question.options.map((option, index) => (
            <button
              className={`group flex min-h-16 items-center justify-between rounded-2xl border px-5 py-4 text-left text-base font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/8 ${
                answer === option.value
                  ? "border-[#3c8786] bg-[#e9f4f2] text-[#205c5a]"
                  : "border-black/10 bg-white/82 text-black/78 hover:border-[#3c8786]/50 hover:bg-white"
              }`}
              disabled={isSaving}
              key={option.value}
              onClick={() => onSelect(option.value)}
              style={{ animationDelay: `${index * 55}ms` }}
              type="button"
            >
              <span>{option.label[language]}</span>
              <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs text-black/42 transition group-hover:bg-[#3c8786]/10">
                {answer === option.value ? String(t.selected) : String(t.choose)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-9">
          <label className="block text-sm font-semibold text-black/58">
            {question.suffix[language]}
          </label>
          <input
            className="mt-3 h-16 w-full rounded-2xl border border-black/12 bg-white/86 px-5 text-2xl font-semibold outline-none transition focus:border-[#3c8786] focus:ring-4 focus:ring-[#3c8786]/10"
            inputMode="decimal"
            max={question.max}
            min={question.min}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={question.placeholder}
            type="number"
            value={inputValue}
          />
          <button
            className="mt-5 h-13 w-full rounded-2xl bg-[#171717] px-5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/18 disabled:cursor-not-allowed disabled:bg-black/40"
            disabled={isSaving}
            onClick={onNumberSubmit}
            type="button"
          >
            {String(t.continue)}
          </button>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          className="text-sm font-semibold text-black/52 transition hover:text-black disabled:text-black/25"
          disabled={isSaving}
          onClick={onBack}
          type="button"
        >
          {String(t.back)}
        </button>
        <span className="text-sm text-black/42">
          {syncText}
        </span>
      </div>
    </div>
  );
}

function ReviewPanel({
  answers,
  isSaving,
  language,
  onBack,
  onComplete,
  pendingSaveCount,
}: {
  answers: Record<string, AnswerValue>;
  isSaving: boolean;
  language: Language;
  onBack: () => void;
  onComplete: () => void;
  pendingSaveCount: number;
}) {
  const t = copy[language];

  return (
    <div className="animate-[page-rise_0.42s_ease_both]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3c8786]">
        {String(t.reviewEyebrow)}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight">
        {String(t.reviewTitle)}
      </h2>
      <dl className="mt-7 grid gap-3 sm:grid-cols-2">
        {Object.entries(answers).map(([key, value]) => (
          <div className="rounded-2xl bg-[#f4f3ef] px-4 py-3" key={key}>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-black/38">
              {key}
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatAnswerValue(value, language)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          className="h-13 rounded-2xl border border-black/12 text-sm font-semibold text-black/62 transition hover:bg-black/[0.03]"
          disabled={isSaving}
          onClick={onBack}
          type="button"
        >
          {String(t.editAnswers)}
        </button>
        <button
          className="h-13 rounded-2xl bg-[#171717] text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black hover:shadow-lg hover:shadow-black/18 disabled:bg-black/40"
          disabled={isSaving}
          onClick={onComplete}
          type="button"
        >
          {isSaving
            ? pendingSaveCount > 0
              ? String(t.finishingSync)
              : String(t.calculating)
            : String(t.seeResult)}
        </button>
      </div>
    </div>
  );
}

function ResultPanel({
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
        <Metric label={String(t.category)} value={translateBmiCategory(result.result.bmiCategory, language)} />
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
            {result.result.paywall?.message
              ? String(t.defaultPaywall)
              : String(t.defaultPaywall)}
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

function formatAnswerValue(value: AnswerValue, language: Language) {
  const label = answerLabels[String(value)];
  return label ? label[language] : value;
}

function translateActivityLabel(activityLevel: string, language: Language) {
  if (language === "en") {
    const labels: Record<string, string> = {
      sedentary: "Sedentary",
      light: "Light activity",
      moderate: "Moderate activity",
      active: "High activity",
      very_active: "Very high activity",
    };

    return labels[activityLevel] ?? activityLevel;
  }

  const labels: Record<string, string> = {
    sedentary: "久坐",
    light: "轻度活动",
    moderate: "中度活动",
    active: "高度活动",
    very_active: "极高活动",
  };

  return labels[activityLevel] ?? activityLevel;
}

function translateBmiCategory(category: string, language: Language) {
  if (language === "en") {
    return category;
  }

  const categories: Record<string, string> = {
    UNDERWEIGHT: "偏轻",
    HEALTHY: "健康",
    OVERWEIGHT: "超重",
    OBESE: "肥胖",
  };

  return categories[category] ?? category;
}

function formatSummary(summary: string, language: Language) {
  if (language === "en") {
    return summary;
  }

  const bmiMatch = summary.match(/Your BMI is ([0-9.]+) \(([^)]+)\)/);
  const dateMatch = summary.match(/by ([0-9-]+)\./);

  if (!bmiMatch) {
    return summary;
  }

  const category = translateBmiCategory(bmiMatch[2], language);
  const targetDate = dateMatch?.[1] ?? "";
  return `你的 BMI 是 ${bmiMatch[1]}（${category}）。系统已根据你的活动水平和目标生成计划${targetDate ? `，预计目标日期为 ${targetDate}` : ""}。`;
}
