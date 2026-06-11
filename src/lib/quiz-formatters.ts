import { answerLabels } from "@/lib/quiz-content";
import type { AnswerValue, Language } from "@/lib/quiz-types";

export function formatAnswerValue(value: AnswerValue, language: Language) {
  const label = answerLabels[String(value)];
  return label ? label[language] : value;
}

export function translateActivityLabel(activityLevel: string, language: Language) {
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

export function translateBmiCategory(category: string, language: Language) {
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

export function formatSummary(summary: string, language: Language) {
  if (language === "en") {
    return summary;
  }

  const bmiMatch = summary.match(/Your BMI is ([0-9.]+) \(([^)]+)\)/);
  const dateMatch = summary.match(/by ([0-9-]+)\./);

  if (!bmiMatch) {
    return summary;
  }

  return `你的 BMI 是 ${bmiMatch[1]}（${translateBmiCategory(
    bmiMatch[2],
    language,
  )}）。按当前目标，预计可在 ${dateMatch?.[1] ?? "目标日期"} 前达成。`;
}
