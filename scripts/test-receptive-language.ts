/**
 * تست‌های واحد ارزیابی زبان دریافتی.
 * فقط اعتبارسنج payload، ساخت نتیجه و کنترل‌های ساختاری بررسی می‌شوند.
 * هیچ میکروفون، ضبط صوت، سرویس خارجی یا دیتابیس لازم نیست.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { RECEPTIVE_LANGUAGE_DOMAINS } from "../src/lib/speech/receptive-language-types";
import {
  buildReceptiveLanguageStored,
  parseReceptiveLanguageInput,
  parseReceptiveLanguageStored,
} from "../src/lib/speech/receptive-language-payload";

const VALID_PATIENT = "ckpatient0000000000000000";
const EVALUATOR = {
  clinicianProfileId: "ckprofile0000000000000000",
  clinicianUserId: "ckuser00000000000000000",
  kind: "PSYCHOLOGIST" as const,
};

function validRatings(): { id: string; domain: string; label: string; score: number }[] {
  return RECEPTIVE_LANGUAGE_DOMAINS.map((domain, index) => ({
    id: domain.id,
    domain: domain.domain,
    label: domain.label,
    score: index % 5,
  }));
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    patientId: VALID_PATIENT,
    ratings: validRatings(),
    overallSeverity: 2,
    notes: "پاسخ‌های مراجع و مشاهده‌ی بالینی",
    status: "FINAL",
    ...overrides,
  };
}

function readSource(file: string) {
  return readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
}

describe("اعتبارسنجی ارزیابی زبان دریافتی", () => {
  it("۱. هر هشت دامنه با امتیاز ۰ تا ۴ پذیرفته می‌شوند", () => {
    const payload = parseReceptiveLanguageInput(baseInput());
    assert.ok(payload);
    assert.equal(payload?.ratings.length, RECEPTIVE_LANGUAGE_DOMAINS.length);
    assert.deepEqual(
      payload?.ratings.map((rating) => rating.id),
      RECEPTIVE_LANGUAGE_DOMAINS.map((domain) => domain.id),
    );
    for (const rating of payload!.ratings) {
      assert.ok(rating.score >= 0 && rating.score <= 4);
    }
  });

  it("۲. امتیاز خارج از محدوده یا غیرصحیح رد می‌شود", () => {
    for (const bad of [5, -1, 1.5, "2", null, Number.NaN]) {
      const ratings = validRatings();
      ratings[0] = { ...ratings[0], score: bad as number };
      assert.equal(parseReceptiveLanguageInput(baseInput({ ratings })), null);
    }
    assert.equal(parseReceptiveLanguageInput(baseInput({ overallSeverity: 5 })), null);
    assert.equal(parseReceptiveLanguageInput(baseInput({ overallSeverity: -1 })), null);
    assert.equal(parseReceptiveLanguageInput(baseInput({ overallSeverity: 1.5 })), null);
  });

  it("۳. دامنه‌ی تکراری، ناقص، اضافه یا دست‌کاری‌شده رد می‌شود", () => {
    const duplicate = [...validRatings()];
    duplicate[1] = { ...duplicate[0] };
    assert.equal(parseReceptiveLanguageInput(baseInput({ ratings: duplicate })), null);

    assert.equal(
      parseReceptiveLanguageInput(baseInput({ ratings: validRatings().slice(0, -1) })),
      null,
    );
    assert.equal(
      parseReceptiveLanguageInput(
        baseInput({
          ratings: [
            ...validRatings(),
            { id: "R9", domain: "extra", label: "اضافه", score: 0 },
          ],
        }),
      ),
      null,
    );

    const alteredLabel = validRatings();
    alteredLabel[0] = { ...alteredLabel[0], label: "برچسب جعلی" };
    assert.equal(parseReceptiveLanguageInput(baseInput({ ratings: alteredLabel })), null);

    const alteredDomain = validRatings();
    alteredDomain[0] = { ...alteredDomain[0], domain: "fake_domain" };
    assert.equal(parseReceptiveLanguageInput(baseInput({ ratings: alteredDomain })), null);
  });

  it("۴. وضعیت غیرنهایی، فیلد ناشناخته و شناسه‌ی نامعتبر رد می‌شوند", () => {
    assert.equal(parseReceptiveLanguageInput(baseInput({ status: "DRAFT" })), null);
    assert.equal(parseReceptiveLanguageInput(baseInput({ userId: "ckuser00000000000000000" })), null);
    assert.equal(parseReceptiveLanguageInput(baseInput({ patientId: "bad" })), null);
    assert.equal(parseReceptiveLanguageInput(baseInput({ notes: "x".repeat(2001) })), null);
    assert.equal(parseReceptiveLanguageInput(baseInput({ notes: 123 })), null);
    assert.equal(parseReceptiveLanguageInput(null), null);
  });
});

describe("ذخیره و بازیابی نتیجه", () => {
  it("۵. نتیجه‌ی ساخته‌شده پس از بازیابی معتبر است", () => {
    const payload = parseReceptiveLanguageInput(baseInput());
    assert.ok(payload);
    const stored = buildReceptiveLanguageStored(
      payload!,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const parsed = parseReceptiveLanguageStored(stored);
    assert.ok(parsed);
    assert.deepEqual(parsed?.ratings, payload!.ratings);
    assert.equal(parsed?.overallSeverity, 2);
    assert.equal(parsed?.assessedAt, "2026-01-01T00:00:00.000Z");
    assert.deepEqual(parsed?.evaluator, EVALUATOR);
  });

  it("۶. شدت کلی مستقل از جمع امتیاز دامنه‌ها نگه داشته می‌شود", () => {
    const payload = parseReceptiveLanguageInput(
      baseInput({
        ratings: validRatings().map((rating) => ({ ...rating, score: 0 })),
        overallSeverity: 4,
      }),
    );
    assert.ok(payload);
    const stored = buildReceptiveLanguageStored(
      payload!,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    assert.equal(stored.overallSeverity, 4);
    assert.equal(
      stored.ratings.reduce((sum, rating) => sum + rating.score, 0),
      0,
    );
  });

  it("۷. کلید، نسخه، هویت ارزیاب و زمان نامعتبر رد می‌شوند", () => {
    const stored = buildReceptiveLanguageStored(
      parseReceptiveLanguageInput(baseInput())!,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const mutations: Record<string, unknown>[] = [
      { ...stored, key: "expressive-language" },
      { ...stored, version: 2 },
      { ...stored, evaluator: { ...stored.evaluator, kind: "OTHER" } },
      { ...stored, evaluator: { ...stored.evaluator, clinicianUserId: "bad" } },
      { ...stored, assessedAt: "not-a-date" },
      { ...stored, totalScore: 12 },
    ];
    for (const mutation of mutations) {
      assert.equal(parseReceptiveLanguageStored(mutation), null);
    }
  });

  it("۸. هیچ نمره‌ی کلی محاسبه‌شده، مجموع یا میانگین در payload نیست", () => {
    const stored = buildReceptiveLanguageStored(
      parseReceptiveLanguageInput(baseInput())!,
      EVALUATOR,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const keys = Object.keys(stored).sort();
    assert.deepEqual(keys, [
      "assessedAt",
      "evaluator",
      "key",
      "notes",
      "overallSeverity",
      "ratings",
      "version",
    ]);
    assert.equal(keys.some((key) => /total|sum|average|mean/i.test(key)), false);
  });
});

describe("کنترل‌های ساختاری و ایمنی", () => {
  it("۹. کاتالوگ و اسکریپت فعال‌سازی، آزمون را AVAILABLE می‌کنند", () => {
    const catalog = readSource("../src/data/speech-catalog.ts");
    const block = catalog.match(/slug: "receptive-language",[\s\S]*?\n  \},/);
    assert.ok(block, "بلوک receptive-language در کاتالوگ پیدا نشد");
    assert.match(block![0], /status: "AVAILABLE"/);
    assert.match(block![0], /implementationPath: "\/speech\/receptive-language"/);

    const activate = readSource("../scripts/activate-speech.ts");
    assert.match(activate, /slug: "receptive-language"/);
  });

  it("۱۰. سرور فقط create می‌کند و به میکروفون یا صوت خام دسترسی ندارد", () => {
    const server = readSource("../src/server/receptive-language.ts");
    assert.match(server, /speechResult\.create/);
    assert.doesNotMatch(server, /speechResult\.update/);
    assert.doesNotMatch(server, /MediaRecorder|getUserMedia|AudioContext/);

    const ui = [
      readSource("../src/components/speech/ReceptiveLanguageRunner.tsx"),
      readSource("../src/components/speech/ReceptiveLanguageReport.tsx"),
    ].join("\n");
    assert.doesNotMatch(ui, /MediaRecorder|getUserMedia|AudioContext/);
  });
});
