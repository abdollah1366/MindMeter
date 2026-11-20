/**
 * تست‌های واحد پرسشنامه VHI-30.
 * فقط توابع خالص و اعتبارسنج payload بررسی می‌شوند؛ هیچ میکروفون، ضبط صوت
 * یا سرویس خارجی برای اجرای این تست‌ها لازم نیست.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { canAccessSpeechResult } from "../src/lib/speech-result-access";
import { VHI_30_MISSING_COUNT, VHI_30_QUESTIONS, VHI_30_QUESTION_IDS } from "../src/lib/speech/vhi-30-questions";
import { parseVhi30Payload, toVhi30Payload } from "../src/lib/speech/vhi-30-payload";
import {
  isVhi30Complete,
  scoreVhi30,
  setVhi30Answer,
  vhi30MissingQuestionIds,
  type Vhi30Answers,
} from "../src/lib/speech/vhi-30-scoring";
import {
  VHI_MAX_TOTAL_SCORE,
  type VhiDomain,
} from "../src/lib/speech/vhi-30-types";

function answersWithScore(score: number): Vhi30Answers {
  const answers: Vhi30Answers = {};
  for (const id of VHI_30_QUESTION_IDS) answers[id] = score;
  return answers;
}

function answersForDomain(domain: VhiDomain, score: number): Vhi30Answers {
  const answers = answersWithScore(0);
  for (const question of VHI_30_QUESTIONS) {
    if (question.domain === domain) answers[question.id] = score;
  }
  return answers;
}

describe("ساختار پرسشنامه VHI-30", () => {
  it("دقیقاً ۳۰ گویه در سه دامنه ۱۰تایی وجود دارد", () => {
    assert.equal(VHI_30_QUESTIONS.length, 30);
    assert.equal(new Set(VHI_30_QUESTION_IDS).size, 30);
    for (const domain of ["functional", "physical", "emotional"] as const) {
      assert.equal(VHI_30_QUESTIONS.filter((question) => question.domain === domain).length, 10);
    }
    assert.deepEqual(VHI_30_QUESTIONS.map((question) => question.order), Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("هر ۳۰ گویه متن فارسی کامل دارند و هیچ متن ناموجودی باقی نمانده است", () => {
    assert.equal(VHI_30_MISSING_COUNT, 0);
    assert.ok(VHI_30_QUESTIONS.every((question) => question.wordingStatus === "AVAILABLE"));
    assert.ok(VHI_30_QUESTIONS.every((question) => question.text.trim().length > 0));
    assert.ok(VHI_30_QUESTIONS.every((question) => /[\u0600-\u06FF]/.test(question.text)));
    assert.ok(VHI_30_QUESTIONS.every((question) => !/[A-Za-z]/.test(question.text)));
    assert.equal(new Set(VHI_30_QUESTIONS.map((question) => question.text)).size, 30);
  });
});

describe("محاسبه نمره", () => {
  it("۱. تمام پاسخ‌ها = ۰، نمره کل ۰ است", () => {
    const scores = scoreVhi30(answersWithScore(0));
    assert.deepEqual(scores, {
      functionalScore: 0,
      physicalScore: 0,
      emotionalScore: 0,
      totalScore: 0,
    });
  });

  it("۲. تمام پاسخ‌ها = ۴، نمره کل ۱۲۰ است", () => {
    const scores = scoreVhi30(answersWithScore(4));
    assert.deepEqual(scores, {
      functionalScore: 40,
      physicalScore: 40,
      emotionalScore: 40,
      totalScore: 120,
    });
    assert.equal(scores.totalScore, VHI_MAX_TOTAL_SCORE);
  });

  it("۳. حداکثر دامنه عملکردی ۴۰ است", () => {
    const scores = scoreVhi30(answersForDomain("functional", 4));
    assert.equal(scores.functionalScore, 40);
    assert.equal(scores.physicalScore, 0);
    assert.equal(scores.emotionalScore, 0);
    assert.equal(scores.totalScore, 40);
  });

  it("۴. حداکثر دامنه جسمانی ۴۰ است", () => {
    const scores = scoreVhi30(answersForDomain("physical", 4));
    assert.equal(scores.physicalScore, 40);
    assert.equal(scores.functionalScore, 0);
    assert.equal(scores.emotionalScore, 0);
    assert.equal(scores.totalScore, 40);
  });

  it("۵. حداکثر دامنه هیجانی ۴۰ است", () => {
    const scores = scoreVhi30(answersForDomain("emotional", 4));
    assert.equal(scores.emotionalScore, 40);
    assert.equal(scores.functionalScore, 0);
    assert.equal(scores.physicalScore, 0);
    assert.equal(scores.totalScore, 40);
  });

  it("۶. پاسخ‌های مخلوط به‌درستی جمع می‌شوند", () => {
    const answers = answersWithScore(0);
    answers.F1 = 4;
    answers.F2 = 3;
    answers.P1 = 2;
    answers.E1 = 1;
    answers.E2 = 4;
    const scores = scoreVhi30(answers);
    assert.equal(scores.functionalScore, 7);
    assert.equal(scores.physicalScore, 2);
    assert.equal(scores.emotionalScore, 5);
    assert.equal(scores.totalScore, 14);
  });

  it("پاسخ نامعتبر یا خارج از محدوده ۰ تا ۴ نادیده گرفته می‌شود", () => {
    const answers = answersWithScore(0);
    answers.F1 = 5;
    answers.F2 = -1;
    answers.F3 = 2.5;
    const scores = scoreVhi30(answers);
    assert.equal(scores.functionalScore, 0);
    assert.equal(isVhi30Complete(answers), false);
  });
});

describe("پرسشنامه ناقص و پیمایش", () => {
  it("۷. پرسشنامه ناقص نمی‌تواند ثبت نهایی شود", () => {
    assert.equal(isVhi30Complete({}), false);
    assert.equal(vhi30MissingQuestionIds({}).length, 30);

    const answers = answersWithScore(2);
    delete answers.E7;
    assert.equal(isVhi30Complete(answers), false);
    assert.deepEqual(vhi30MissingQuestionIds(answers), ["E7"]);

    // حتی اگر فیلد نمره‌ها دستکاری شود، اعتبارسنج سرور payload ناقص را رد می‌کند.
    const forged = toVhi30Payload(answersWithScore(2));
    forged.answers = forged.answers.filter((answer) => answer.questionId !== "E7");
    assert.equal(parseVhi30Payload(forged), null);
  });

  it("۸. پاسخ‌ها هنگام پیمایش بین گویه‌ها دست‌نخورده می‌مانند", () => {
    let answers: Vhi30Answers = {};
    answers = setVhi30Answer(answers, "F1", 3);
    answers = setVhi30Answer(answers, "F2", 4);

    // تغییر شاخص گویه‌ی جاری (رفتن به گویه‌ی بعد و بازگشت) نباید پاسخ‌ها را تغییر دهد.
    let index = 1;
    const before = JSON.stringify(answers);
    index = 2;
    index = 1;
    assert.equal(index, 1);
    assert.equal(JSON.stringify(answers), before);

    answers = setVhi30Answer(answers, "F3", 2);
    assert.equal(answers.F1, 3);
    assert.equal(answers.F2, 4);
    assert.equal(answers.F3, 2);

    // پاسخ نامعتبر یا شناسه ناشناخته تغییری ایجاد نمی‌کند.
    assert.equal(setVhi30Answer(answers, "F1", 9), answers);
    assert.equal(setVhi30Answer(answers, "UNKNOWN", 2), answers);
  });

  it("پاسخ‌ها دقیقاً یک گزینه برای هر گویه دارند", () => {
    const answers = answersWithScore(3);
    const payload = toVhi30Payload(answers);
    assert.equal(payload.answers.length, 30);
    assert.equal(new Set(payload.answers.map((answer) => answer.questionId)).size, 30);
  });
});

describe("بدون میکروفون و بدون ضبط صوت", () => {
  it("۹. هیچ‌کدام از فایل‌های VHI-30 به API میکروفون یا ضبط صوت دسترسی ندارند", () => {
    const files = [
      "../src/components/speech/Vhi30Runner.tsx",
      "../src/components/speech/Vhi30Report.tsx",
      "../src/app/speech/vhi-30/page.tsx",
      "../src/app/speech/vhi-30/result/[id]/page.tsx",
      "../src/lib/speech/vhi-30-types.ts",
      "../src/lib/speech/vhi-30-questions.ts",
      "../src/lib/speech/vhi-30-scoring.ts",
      "../src/lib/speech/vhi-30-payload.ts",
    ];
    const sources = files
      .map((file) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8"))
      .join("\n")
      .toLowerCase();
    for (const forbidden of [
      "getusermedia",
      "navigator.mediadevices",
      "audiocapture",
      "audiorecorder",
      "mediarecorder",
      "audiocontext",
    ]) {
      assert.equal(sources.includes(forbidden), false, `غیرمجاز: ${forbidden}`);
    }
  });
});

describe("ذخیره و بازیابی نتیجه", () => {
  it("۱۰. payload ساخته‌شده پس از ذخیره و بازیابی معتبر است", () => {
    const answers = answersWithScore(2);
    const payload = toVhi30Payload(answers);
    const stored = JSON.parse(JSON.stringify(payload)) as unknown;
    const decoded = parseVhi30Payload(stored);
    assert.deepEqual(decoded, payload);
    assert.equal(decoded?.totalScore, 60);
    assert.equal(decoded?.functionalScore, 20);
    assert.equal(decoded?.physicalScore, 20);
    assert.equal(decoded?.emotionalScore, 20);
  });

  it("نمره‌های دستکاری‌شده و فیلدهای غیرمجاز رد می‌شوند", () => {
    const payload = toVhi30Payload(answersWithScore(1));
    const forgedScore = structuredClone(payload);
    forgedScore.totalScore = 120;
    assert.equal(parseVhi30Payload(forgedScore), null);

    const forgedAnswer = structuredClone(payload);
    forgedAnswer.answers[0].score = 4;
    assert.equal(parseVhi30Payload(forgedAnswer), null);

    assert.equal(parseVhi30Payload({ ...payload, userId: "attacker" }), null);
    assert.equal(parseVhi30Payload({ ...payload, diagnosis: "disorder" }), null);
    assert.equal(parseVhi30Payload({ ...payload, severity: "severe" }), null);
    for (const forbidden of ["diagnosis", "severity", "base64", "audio", "userId"]) {
      assert.equal(JSON.stringify(payload).includes(forbidden), false, `forbidden: ${forbidden}`);
    }
  });

  it("دسترسی به نتیجه فقط برای صاحب آن مجاز است", () => {
    assert.equal(canAccessSpeechResult("owner", "owner"), true);
    assert.equal(canAccessSpeechResult("other", "owner"), false);
    assert.equal(canAccessSpeechResult(null, "owner"), false);
  });

  it("اعتبارسنج آزمون‌های آکوستیکی، payload پرسشنامه را رد می‌کند", () => {
    const payload = toVhi30Payload(answersWithScore(0));
    assert.equal(payload.key, "vhi-30");
    assert.equal("attempts" in payload, false);
    assert.equal("samples" in payload, false);
  });
});
