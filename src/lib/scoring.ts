import type { PsychTest, Question, ResultRange } from "./types";

export function optionsFor(test: PsychTest, question: Question) {
  return question.options ?? test.options;
}

export function scoreAnswer(test: PsychTest, question: Question, value: number) {
  if (!question.reverse) return value;
  const values = optionsFor(test, question).map((o) => o.value);
  return Math.max(...values) + Math.min(...values) - value;
}

/** answers: نگاشت شناسه‌ی سؤال به مقدار گزینه‌ی انتخاب‌شده */
export function calculateScore(test: PsychTest, answers: Record<string, number>) {
  return test.questions.reduce((sum, q) => {
    const v = answers[q.id];
    return v === undefined ? sum : sum + scoreAnswer(test, q, v);
  }, 0);
}

export function maxScore(test: PsychTest) {
  return test.questions.reduce((sum, q) => {
    const values = optionsFor(test, q).map((o) => o.value);
    return sum + Math.max(...values);
  }, 0);
}

export function findResult(test: PsychTest, score: number): ResultRange | undefined {
  return test.results.find((r) => score >= r.min && score <= r.max);
}

export function toPersianDigits(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
