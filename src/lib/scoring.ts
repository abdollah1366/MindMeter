import type { AnswerOption, PsychTest, Question, Scale, ScaleScore, TestAlert } from "./types";

export type Answers = Record<string, number>;

/** مقدار گزینه‌ی «نمی‌دانم» در سؤال‌های توانایی (امتیاز صفر) */
export const SKIP_VALUE = -1;
const SKIP_OPTION: AnswerOption = { label: "نمی‌دانم / بدون پاسخ", value: SKIP_VALUE };

export function optionsFor(test: PsychTest, question: Question): AnswerOption[] {
  const opts = question.options ?? test.options;
  return question.answer !== undefined ? [...opts, SKIP_OPTION] : opts;
}

export const LEVEL_LABEL = { easy: "ساده", medium: "متوسط", hard: "دشوار" } as const;

function bounds(test: PsychTest, q: Question) {
  if (q.answer !== undefined) return { lo: 0, hi: 1 };
  const values = optionsFor(test, q).map((o) => o.value);
  return { lo: Math.min(...values), hi: Math.max(...values) };
}

export function scaleOf(test: PsychTest, q: Question) {
  return q.scale ?? test.scales[0].key;
}

export function scoreAnswer(test: PsychTest, q: Question, value: number) {
  if (q.answer !== undefined) return value === q.answer ? 1 : 0;
  if (!q.reverse) return value;
  const { lo, hi } = bounds(test, q);
  return hi + lo - value;
}

/** آیا سؤال در این مقیاس (یا مقیاس ترکیبی) شمرده می‌شود */
export function inScale(test: PsychTest, scale: Scale, q: Question) {
  const key = scaleOf(test, q);
  return scale.includes ? scale.includes.includes(key) : key === scale.key;
}

export function scoreScale(test: PsychTest, scale: Scale, answers: Answers): ScaleScore {
  const m = scale.multiplier ?? 1;
  let raw = 0;
  let min = 0;
  let max = 0;
  for (const q of test.questions) {
    if (!inScale(test, scale, q)) continue;
    const { lo, hi } = bounds(test, q);
    min += lo;
    max += hi;
    const v = answers[q.id];
    if (v !== undefined) raw += scoreAnswer(test, q, v);
  }
  const score = raw * m;
  return {
    key: scale.key,
    title: scale.title,
    raw,
    score,
    min: min * m,
    max: max * m,
    result: scale.results.find((r) => score >= r.min && score <= r.max),
  };
}

export function scoreTest(test: PsychTest, answers: Answers): ScaleScore[] {
  return test.scales.map((s) => scoreScale(test, s, answers));
}

export function alertsFor(test: PsychTest, answers: Answers): TestAlert[] {
  return test.questions
    .filter((q) => q.alert && (answers[q.id] ?? -Infinity) >= q.alert.minValue)
    .map((q) => ({ questionId: q.id, message: q.alert!.message }));
}

export function isComplete(test: PsychTest, answers: Answers) {
  return test.questions.every((q) => {
    const v = answers[q.id];
    return v !== undefined && optionsFor(test, q).some((o) => o.value === v);
  });
}

export function toPersianDigits(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** ابزار کمکی: ساخت بازه‌های سه‌گانه‌ی پایین/متوسط/بالا برای مقیاس‌های بدون نقطه‌ی برش بالینی */
export function tertiles(
  min: number,
  max: number,
  labels: [string, string, string],
  descriptions: [string, string, string],
) {
  const span = (max - min + 1) / 3;
  const a = Math.round(min + span) - 1;
  const b = Math.round(min + 2 * span) - 1;
  return [
    { min, max: a, title: labels[0], description: descriptions[0] },
    { min: a + 1, max: b, title: labels[1], description: descriptions[1] },
    { min: b + 1, max, title: labels[2], description: descriptions[2] },
  ];
}
