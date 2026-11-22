/**
 * تستهای واحد آزمون خواندن متن با صدای بلند.
 * فقط اعتبارسنج payload، محاسبه خلاصه از مشاهدات و کنترلهای ساختاری بررسی میشوند.
 * هیچ میکروفون، ضبط صوت، سرویس خارجی یا دیتابیس لازم نیست.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  READING_ALOUD_DOMAINS,
  READING_ALOUD_PASSAGES,
  type ReadingAloudPerformance,
} from "../src/lib/speech/reading-aloud-types";
import {
  buildReadingAloudStored,
  computeReadingAloudSummary,
  parseReadingAloudInput,
  parseReadingAloudStored,
} from "../src/lib/speech/reading-aloud-payload";

const VALID_PATIENT = "ckpatient0000000000000000";
const EVALUATOR = {
  clinicianProfileId: "ckprofile0000000000000000",
  clinicianUserId: "ckuser00000000000000000",
  kind: "PSYCHOLOGIST" as const,
};
const PASSAGE = READING_ALOUD_PASSAGES[0];

function validPerformance(): ReadingAloudPerformance {
  return {
    durationSeconds: 40,
    wordsRead: 50,
    misreadWords: 4,
    omissions: 2,
    additions: 1,
    selfCorrections: 3,
  };
}

function validRatings(): { id: string; domain: string; label: string; score: number }[] {
  return READING_ALOUD_DOMAINS.map((domain, index) => ({
    id: domain.id,
    domain: domain.domain,
    label: domain.label,
    score: index % 5,
  }));
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    patientId: VALID_PATIENT,
    passageId: PASSAGE.id,
    performance: validPerformance(),
    ratings: validRatings(),
    overallSeverity: 2,
    notes: "خواندن با مکثهای مکرر",
    status: "FINAL",
    ...overrides,
  };
}

function readSource(file: string) {
  return readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
}

describe("ساختار آزمون خواندن متن", () => {
  it("۱. سه متن Original و سه دامنه کیفی با مقیاس ۰ تا ۴ وجود دارد", () => {
    assert.equal(READING_ALOUD_PASSAGES.length, 3);
    assert.deepEqual(
      READING_ALOUD_PASSAGES.map((passage) => passage.id),
      ["P1", "P2", "P3"],
    );
    for (const passage of READING_ALOUD_PASSAGES) {
      assert.ok(passage.title);
      assert.ok(passage.wordCount > 0);
      assert.ok(passage.lines.length > 0);
    }
    assert.deepEqual(
      READING_ALOUD_DOMAINS.map((domain) => domain.id),
      ["Q1", "Q2", "Q3"],
    );
    assert.equal(READING_ALOUD_DOMAINS.length, 3);
  });

  it("۲. ورودی معتبر پذیرفته میشود و متن انتخابشده حفظ میشود", () => {
    const payload = parseReadingAloudInput(baseInput());
    assert.ok(payload);
    assert.equal(payload?.passage.id, PASSAGE.id);
    assert.equal(payload?.patientId, VALID_PATIENT);
    assert.deepEqual(payload?.performance, validPerformance());
    assert.deepEqual(payload?.ratings, validRatings());
  });
});

describe("اعتبارسنجی مشاهدات و امتیازها", () => {
  it("۳. اعداد خارج از محدوده یا غیرصحیح رد میشوند", () => {
    const badPerformances: Record<string, unknown>[] = [
      { durationSeconds: 0 },
      { durationSeconds: 3601 },
      { durationSeconds: 1.5 },
      { wordsRead: PASSAGE.wordCount + 1 },
      { wordsRead: -1 },
      { misreadWords: 101 },
      { omissions: -1 },
      { additions: "2" },
      { selfCorrections: Number.NaN },
    ];
    for (const patch of badPerformances) {
      assert.equal(
        parseReadingAloudInput(baseInput({ performance: { ...validPerformance(), ...patch } })),
        null,
      );
    }
    assert.equal(parseReadingAloudInput(baseInput({ overallSeverity: 5 })), null);
    assert.equal(parseReadingAloudInput(baseInput({ overallSeverity: -1 })), null);
  });

  it("۴. فیلد اضافی یا ناقص در مشاهدات رد میشود", () => {
    assert.equal(
      parseReadingAloudInput(
        baseInput({ performance: { ...validPerformance(), extraField: 1 } }),
      ),
      null,
    );
    const incomplete = { ...validPerformance() };
    delete (incomplete as Record<string, unknown>).additions;
    assert.equal(parseReadingAloudInput(baseInput({ performance: incomplete })), null);
  });

  it("۵. مجموع واژههای اشتباه و حذفشده نباید از واژههای خواندهشده بیشتر باشد", () => {
    assert.equal(
      parseReadingAloudInput(
        baseInput({
          performance: {
            ...validPerformance(),
            wordsRead: 3,
            misreadWords: 4,
            omissions: 2,
          },
        }),
      ),
      null,
    );
    assert.ok(
      parseReadingAloudInput(
        baseInput({
          performance: {
            ...validPerformance(),
            wordsRead: 10,
            misreadWords: 6,
            omissions: 4,
          },
        }),
      ),
    );
  });

  it("۶. متن ناشناخته، دامنه دستکاریشده و امتیاز خارج از محدوده رد میشوند", () => {
    assert.equal(parseReadingAloudInput(baseInput({ passageId: "P9" })), null);

    for (const bad of [5, -1, 1.5, "2", null, Number.NaN]) {
      const ratings = validRatings();
      ratings[0] = { ...ratings[0], score: bad as number };
      assert.equal(parseReadingAloudInput(baseInput({ ratings })), null);
    }

    const duplicate = [...validRatings()];
    duplicate[1] = { ...duplicate[0] };
    assert.equal(parseReadingAloudInput(baseInput({ ratings: duplicate })), null);

    assert.equal(
      parseReadingAloudInput(baseInput({ ratings: validRatings().slice(0, -1) })),
      null,
    );

    const altered = validRatings();
    altered[0] = { ...altered[0], domain: "fake_domain" };
    assert.equal(parseReadingAloudInput(baseInput({ ratings: altered })), null);

    const alteredLabel = validRatings();
    alteredLabel[0] = { ...alteredLabel[0], label: "برچسب جعلی" };
    assert.equal(parseReadingAloudInput(baseInput({ ratings: alteredLabel })), null);
  });

  it("۷. وضعیت غیرنهایی، فیلد ناشناخته و شناسه نامعتبر رد میشوند", () => {
    assert.equal(parseReadingAloudInput(baseInput({ status: "DRAFT" })), null);
    assert.equal(parseReadingAloudInput(baseInput({ userId: "ckuser00000000000000000" })), null);
    assert.equal(parseReadingAloudInput(baseInput({ patientId: "bad" })), null);
    assert.equal(parseReadingAloudInput(baseInput({ notes: "x".repeat(2001) })), null);
    assert.equal(parseReadingAloudInput(baseInput({ notes: 123 })), null);
    assert.equal(parseReadingAloudInput(null), null);
  });
});

describe("محاسبه خلاصه و ذخیره نتیجه", () => {
  it("۸. خلاصه عملکرد دقیقاً از مشاهدات محاسبه میشود", () => {
    const summary = computeReadingAloudSummary(validPerformance());
    // 4 + 2 + 1 = 7 خطا؛ 50 - 4 - 2 = 44 واژه صحیح
    assert.equal(summary.errorCount, 7);
    assert.equal(summary.wordsCorrect, 44);
    assert.equal(summary.accuracyPercent, 88);
    // 44 / 40 * 60 = 66 واژه صحیح در دقیقه
    assert.equal(summary.wordsCorrectPerMinute, 66);

    const zero = computeReadingAloudSummary({
      durationSeconds: 30,
      wordsRead: 0,
      misreadWords: 0,
      omissions: 0,
      additions: 0,
      selfCorrections: 0,
    });
    assert.deepEqual(zero, {
      errorCount: 0,
      wordsCorrect: 0,
      accuracyPercent: 0,
      wordsCorrectPerMinute: 0,
    });
  });

  it("۹. نتیجه ساختهشده پس از بازیابی معتبر است", () => {
    const payload = parseReadingAloudInput(baseInput());
    assert.ok(payload);
    const stored = buildReadingAloudStored(
      payload!,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const parsed = parseReadingAloudStored(stored);
    assert.ok(parsed);
    assert.deepEqual(parsed?.performance, payload!.performance);
    assert.deepEqual(parsed?.ratings, payload!.ratings);
    assert.deepEqual(parsed?.summary, computeReadingAloudSummary(payload!.performance));
    assert.equal(parsed?.overallSeverity, 2);
    assert.equal(parsed?.assessedAt, "2026-01-01T00:00:00.000Z");
    assert.deepEqual(parsed?.evaluator, EVALUATOR);
  });

  it("۱۰. خلاصه دستکاریشده نادیده گرفته و دوباره محاسبه میشود", () => {
    const payload = parseReadingAloudInput(baseInput())!;
    const stored = buildReadingAloudStored(
      payload,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const tampered = {
      ...stored,
      summary: { errorCount: 999, wordsCorrect: 999, accuracyPercent: 999, wordsCorrectPerMinute: 999 },
    };
    const parsed = parseReadingAloudStored(tampered);
    assert.ok(parsed);
    assert.notDeepEqual(parsed?.summary, tampered.summary);
    assert.deepEqual(parsed?.summary, computeReadingAloudSummary(stored.performance));
  });

  it("۱۱. کلید، نسخه، متن، هویت ارزیاب و زمان نامعتبر رد میشوند", () => {
    const stored = buildReadingAloudStored(
      parseReadingAloudInput(baseInput())!,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const mutations: Record<string, unknown>[] = [
      { ...stored, key: "expressive-language" },
      { ...stored, version: 2 },
      { ...stored, passage: { ...stored.passage, wordCount: 999 } },
      { ...stored, passage: { ...stored.passage, title: "جعلی" } },
      { ...stored, evaluator: { ...stored.evaluator, kind: "OTHER" } },
      { ...stored, evaluator: { ...stored.evaluator, clinicianUserId: "bad" } },
      { ...stored, assessedAt: "not-a-date" },
      { ...stored, totalScore: 12 },
    ];
    for (const mutation of mutations) {
      assert.equal(parseReadingAloudStored(mutation), null);
    }
  });
});

describe("کنترلهای ساختاری و ایمنی", () => {
  it("۱۲. کاتالوگ و اسکریپت فعالسازی، آزمون را AVAILABLE میکنند", () => {
    const catalog = readSource("../src/data/speech-catalog.ts");
    const block = catalog.match(/slug: "reading-aloud",[\s\S]*?\n  \},/);
    assert.ok(block, "بلوک reading-aloud در کاتالوگ پیدا نشد");
    assert.match(block![0], /status: "AVAILABLE"/);
    assert.match(block![0], /implementationPath: "\/speech\/reading-aloud"/);

    const activate = readSource("../scripts/activate-speech.ts");
    assert.match(activate, /slug: "reading-aloud"/);
  });

  it("۱۳. سرور فقط create میکند و به میکروفون یا صوت خام دسترسی ندارد", () => {
    const server = readSource("../src/server/reading-aloud.ts");
    assert.match(server, /speechResult\.create/);
    assert.doesNotMatch(server, /speechResult\.update/);
    assert.doesNotMatch(server, /MediaRecorder|getUserMedia|AudioContext/);

    const ui = [
      readSource("../src/components/speech/ReadingAloudRunner.tsx"),
      readSource("../src/components/speech/ReadingAloudReport.tsx"),
    ].join("\n");
    assert.doesNotMatch(ui, /MediaRecorder|getUserMedia|AudioContext/);
  });
});
