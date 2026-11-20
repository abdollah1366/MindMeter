/**
 * اعتبارسنجی سختگیرانه نتیجه VHI-30 پیش از ذخیره.
 *
 * ورودی مرورگر قابل دستکاری است. تنها لیست سفیدی از فیلدها پذیرفته میشود؛
 * تمام نمرهها در سرور دوباره از روی پاسخها محاسبه و با مقادیر ارسالشده مقایسه
 * میشوند. هیچ متن تشخیصی، برچسب شدت یا فیلد ناشناختهای ذخیره نمیشود و هیچ
 * دادهی مربوط به صوت (ضبط، طیف، میکروفون) در payload وجود ندارد.
 */
import { VHI_30_QUESTION_IDS } from "./vhi-30-questions";
import { scoreVhi30 } from "./vhi-30-scoring";
import { VHI_MAX_TOTAL_SCORE, type VHIAnswer, type Vhi30Scores } from "./vhi-30-types";

export type Vhi30StoredResult = Vhi30Scores & {
  key: "vhi-30";
  version: 1;
  answers: VHIAnswer[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isValidIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isValidItemScore(value: unknown): value is number {
  return isValidIntegerInRange(value, 0, 4);
}

function parseAnswer(value: unknown): VHIAnswer | null {
  if (!isRecord(value)) return null;
  if (!hasOnlyKeys(value, ["questionId", "score"])) return null;
  if (typeof value.questionId !== "string" || !VHI_30_QUESTION_IDS.includes(value.questionId)) return null;
  if (!isValidItemScore(value.score)) return null;
  return { questionId: value.questionId, score: value.score };
}

export function parseVhi30Payload(input: unknown): Vhi30StoredResult | null {
  if (!isRecord(input)) return null;
  if (
    !hasOnlyKeys(input, [
      "key",
      "version",
      "answers",
      "functionalScore",
      "physicalScore",
      "emotionalScore",
      "totalScore",
    ])
  ) {
    return null;
  }
  if (input.key !== "vhi-30" || input.version !== 1) return null;
  if (!Array.isArray(input.answers) || input.answers.length !== VHI_30_QUESTION_IDS.length) return null;

  const answers: VHIAnswer[] = [];
  const seen = new Set<string>();
  for (const raw of input.answers) {
    const answer = parseAnswer(raw);
    if (!answer || seen.has(answer.questionId)) return null;
    seen.add(answer.questionId);
    answers.push(answer);
  }
  // هر ۳۰ شناسه دقیقاً یک بار و به ترتیب ثابت پرسشنامه حضور دارند.
  if (VHI_30_QUESTION_IDS.some((id) => !seen.has(id))) return null;
  answers.sort(
    (a, b) =>
      VHI_30_QUESTION_IDS.indexOf(a.questionId) - VHI_30_QUESTION_IDS.indexOf(b.questionId),
  );

  if (!isValidIntegerInRange(input.functionalScore, 0, 40)) return null;
  if (!isValidIntegerInRange(input.physicalScore, 0, 40)) return null;
  if (!isValidIntegerInRange(input.emotionalScore, 0, 40)) return null;
  if (!isValidIntegerInRange(input.totalScore, 0, VHI_MAX_TOTAL_SCORE)) return null;

  const map: Record<string, number> = {};
  for (const answer of answers) map[answer.questionId] = answer.score;
  const expected = scoreVhi30(map);
  if (
    input.functionalScore !== expected.functionalScore ||
    input.physicalScore !== expected.physicalScore ||
    input.emotionalScore !== expected.emotionalScore ||
    input.totalScore !== expected.totalScore
  ) {
    return null;
  }

  return {
    key: "vhi-30",
    version: 1,
    answers,
    ...expected,
  };
}

/** ساخت payload از پاسخهای کاملشده در مرورگر. */
export function toVhi30Payload(answers: Record<string, number>): Vhi30StoredResult {
  const ordered: VHIAnswer[] = VHI_30_QUESTION_IDS.map((questionId) => ({
    questionId,
    score: answers[questionId],
  }));
  return { key: "vhi-30", version: 1, answers: ordered, ...scoreVhi30(answers) };
}
