/**
 * محاسبه نمره پرسشنامه VHI-30.
 *
 * جمع سادهای از پاسخها است: هر گویه ۰ تا ۴، هر دامنه ۰ تا ۴۰ و نمره کل ۰ تا ۱۲۰.
 * هیچ آستانه، برچسب شدت یا تفسیر تشخیصی در این ماژول وجود ندارد.
 */
import { VHI_30_QUESTIONS } from "./vhi-30-questions";
import {
  VHI_MAX_ITEM_SCORE,
  VHI_MIN_SCORE,
  VHI_RESPONSE_SCALE,
  type VHIAnswer,
  type Vhi30Scores,
  type VhiDomain,
} from "./vhi-30-types";

/** نگهداری پاسخها در یک شیء واحد؛ پیمایش بین گویهها این شیء را تغییر نمیدهد. */
export type Vhi30Answers = Record<string, number>;

export function isValidVhiScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= VHI_MIN_SCORE &&
    value <= VHI_MAX_ITEM_SCORE
  );
}

export function vhi30AnswersToMap(answers: readonly VHIAnswer[]): Vhi30Answers {
  const map: Vhi30Answers = {};
  for (const answer of answers) {
    if (isValidVhiScore(answer.score)) map[answer.questionId] = answer.score;
  }
  return map;
}

/** شناسه گویههایی که پاسخ معتبری ندارند. */
export function vhi30MissingQuestionIds(answers: Vhi30Answers): string[] {
  return VHI_30_QUESTIONS.filter((question) => !isValidVhiScore(answers[question.id])).map(
    (question) => question.id,
  );
}

/** ثبت نهایی تنها زمانی مجاز است که هر ۳۰ گویه پاسخ معتبر داشته باشند. */
export function isVhi30Complete(answers: Vhi30Answers): boolean {
  return vhi30MissingQuestionIds(answers).length === 0;
}

export function scoreVhi30Domain(answers: Vhi30Answers, domain: VhiDomain): number {
  return VHI_30_QUESTIONS.filter((question) => question.domain === domain).reduce(
    (sum, question) => sum + (isValidVhiScore(answers[question.id]) ? answers[question.id] : 0),
    0,
  );
}

export function scoreVhi30(answers: Vhi30Answers): Vhi30Scores {
  const functionalScore = scoreVhi30Domain(answers, "functional");
  const physicalScore = scoreVhi30Domain(answers, "physical");
  const emotionalScore = scoreVhi30Domain(answers, "emotional");
  return {
    functionalScore,
    physicalScore,
    emotionalScore,
    totalScore: functionalScore + physicalScore + emotionalScore,
  };
}

/**
 * افزودن یا تغییر پاسخ بدون دستکاری پاسخهای قبلی. رابط کاربری تنها همین تابع
 * را برای ذخیره پاسخها فراخوانی میکند، بنابراین بازگشت به گویهی قبل هیچ پاسخی
 * را پاک نمیکند.
 */
export function setVhi30Answer(
  answers: Vhi30Answers,
  questionId: string,
  score: number,
): Vhi30Answers {
  if (!VHI_30_QUESTIONS.some((question) => question.id === questionId)) return answers;
  if (!isValidVhiScore(score)) return answers;
  return { ...answers, [questionId]: score };
}

export function vhi30ScoreLabel(score: number | undefined): string {
  if (!isValidVhiScore(score)) return "—";
  return VHI_RESPONSE_SCALE.find((option) => option.score === score)?.label ?? "—";
}
