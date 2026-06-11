export type Language = "en" | "zh";
export type AnswerValue = string | number;
export type SyncStatus = "idle" | "syncing" | "saved" | "error";

export type QuestionImage = {
  src: string;
  alt: Record<Language, string>;
  caption?: Record<Language, string>;
};

export type Question =
  | {
      key: string;
      title: Record<Language, string>;
      helper?: Record<Language, string>;
      image?: QuestionImage;
      type: "single";
      options: { label: Record<Language, string>; value: string }[];
    }
  | {
      key: string;
      title: Record<Language, string>;
      helper?: Record<Language, string>;
      image?: QuestionImage;
      type: "number";
      suffix: Record<Language, string>;
      min: number;
      max: number;
      placeholder: string;
    };

export type ProgressAnswer = {
  questionKey: string;
  value: AnswerValue;
};

export type SessionProgress = {
  sessionId: string;
  currentStep: number;
  status: string;
  subscriptionStatus: string;
  answers: ProgressAnswer[];
};

export type ResultResponse = {
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

export type CopyValue = string | ((min: number, max: number) => string);
export type QuizCopy = Record<Language, Record<string, CopyValue>>;
