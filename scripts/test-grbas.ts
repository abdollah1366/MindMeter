/**
 * تست‌های واحد مقیاس GRBAS.
 * فقط توابع خالص، اعتبارسنج payload و کنترل دسترسی بررسی می‌شوند.
 * هیچ میکروفون، ضبط صوت، سرویس خارجی یا دیتابیس لازم نیست.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { canAccessSpeechResult } from "../src/lib/speech-result-access";
import {
  GRBAS_MAX_SCORE,
  GRBAS_SAMPLE_SOURCES,
  type GrbasScores,
} from "../src/lib/speech/grbas-types";
import {
  canViewGrbasResult,
  formatGrbasSummary,
  isApprovedGrbasEvaluator,
  isGrbasScoresComplete,
} from "../src/lib/speech/grbas-scoring";
import {
  GRBAS_MAX_NOTES_LENGTH,
  GRBAS_MAX_SAMPLE_NOTE_LENGTH,
  buildGrbasStored,
  parseGrbasInput,
  parseGrbasStored,
} from "../src/lib/speech/grbas-payload";

const VALID_PATIENT = "ckpatient0000000000000000";

function validScores(): GrbasScores {
  return { G: 1, R: 2, B: 0, A: 3, S: 1 };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    patientId: VALID_PATIENT,
    scores: validScores(),
    sampleSource: "IN_PERSON",
    sampleNote: null,
    notes: "توضیح ارزیاب",
    status: "FINAL",
    ...overrides,
  };
}

function readSource(file: string) {
  return readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
}

describe("اعتبارسنجی امتیاز GRBAS", () => {
  it("۱. امتیازهای ۰ تا ۳ برای هر مؤلفه پذیرفته می‌شوند", () => {
    for (let score = 0; score <= 3; score++) {
      const payload = parseGrbasInput(
        baseInput({ scores: { G: score, R: score, B: score, A: score, S: score } }),
      );
      assert.ok(payload, `امتیاز ${score} باید پذیرفته شود`);
      assert.deepEqual(payload?.scores.G, score);
    }
    const mixed = parseGrbasInput(baseInput({ scores: { G: 0, R: 1, B: 2, A: 3, S: 1 } }));
    assert.ok(mixed);
    assert.deepEqual(mixed?.scores, { G: 0, R: 1, B: 2, A: 3, S: 1 });
  });

  it("۲. امتیاز خارج از محدوده ۰ تا ۳ رد می‌شود", () => {
    for (const bad of [4, -1, 1.5, "2", null, Number.NaN, Number.POSITIVE_INFINITY]) {
      for (const key of ["G", "R", "B", "A", "S"] as const) {
        const scores = { ...validScores(), [key]: bad };
        assert.equal(parseGrbasInput(baseInput({ scores })), null, `امتیاز نامعتبر: ${String(bad)}`);
      }
    }
    assert.equal(parseGrbasInput(baseInput({ scores: { G: 1, R: 2, B: 0, A: 3 } })), null);
    assert.equal(parseGrbasInput(baseInput({ scores: "1,2,0,3,1" })), null);
  });

  it("۶. گزینه‌ی «قابل ارزیابی نیست» پذیرفته نمی‌شود", () => {
    for (const bad of [null, -1, "NA", 4, 5]) {
      const scores = { ...validScores(), S: bad };
      assert.equal(parseGrbasInput(baseInput({ scores })), null);
      assert.equal(isGrbasScoresComplete(scores as unknown as Partial<GrbasScores>), false);
    }
    // امتیاز ۰ باید با «قابل ارزیابی نیست» اشتباه گرفته نشود.
    assert.ok(parseGrbasInput(baseInput({ scores: { ...validScores(), S: 0 } })));
  });
});

describe("استقلال مؤلفه‌ها و عدم نمره‌ی کلی", () => {
  it("۳. تغییر یک مؤلفه سایر مؤلفه‌ها را تغییر نمی‌دهد", () => {
    const first = { G: 0, R: 0, B: 0, A: 0, S: 0 };
    const second = { ...first, G: 3 };
    assert.deepEqual(second, { G: 3, R: 0, B: 0, A: 0, S: 0 });
    assert.equal(formatGrbasSummary(second), "G3 R0 B0 A0 S0");
    const stored = buildGrbasStored(
      baseInput({ scores: first }) as never,
      { clinicianProfileId: "ckprofile0000000000000000", clinicianUserId: "ckuser00000000000000000", kind: "PSYCHOLOGIST" },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    assert.deepEqual(stored.scores, first);
  });

  it("۴. هیچ نمره‌ی کلی، مجموع یا میانگین در payload وجود ندارد", () => {
    const payload = parseGrbasInput(baseInput());
    assert.ok(payload);
    const stored = buildGrbasStored(
      payload!,
      { clinicianProfileId: "ckprofile0000000000000000", clinicianUserId: "ckuser00000000000000000", kind: "PSYCHOLOGIST" },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    assert.deepEqual(Object.keys(stored).sort(), [
      "assessedAt",
      "evaluator",
      "key",
      "notes",
      "sampleNote",
      "sampleSource",
      "scores",
      "status",
      "version",
    ]);
    assert.equal("total" in stored, false);
    assert.equal("overall" in stored, false);
    assert.equal("average" in stored, false);
    assert.equal("sum" in stored, false);
    assert.equal(formatGrbasSummary(stored.scores), "G1 R2 B0 A3 S1");
    // فرمت خلاصه فقط نمایشی است و شدت کلی نیست.
    assert.match(formatGrbasSummary(stored.scores), /^G\d R\d B\d A\d S\d$/);
  });
});

describe("مدیریت ارزیابی ناقص", () => {
  it("۵. ارزیابی ناقص رد می‌شود", () => {
    assert.equal(parseGrbasInput(baseInput({ scores: { G: 1, R: 2, B: 0, A: 3 } })), null);
    assert.equal(
      isGrbasScoresComplete({ G: 1, R: 2, B: 0, A: 3 } as Partial<GrbasScores>),
      false,
    );
    // همه‌ی پنج مؤلفه با ۰ هم کامل محسوب می‌شوند (امتیاز صفر ≠ ناقص).
    assert.equal(
      isGrbasScoresComplete({ G: 0, R: 0, B: 0, A: 0, S: 0 }),
      true,
    );
  });

  it("وضعیت غیر FINAL رد می‌شود", () => {
    assert.equal(parseGrbasInput(baseInput({ status: "DRAFT" })), null);
    assert.equal(parseGrbasInput(baseInput({ status: "draft" })), null);
    const { status: _status, ...withoutStatus } = baseInput();
    assert.equal(parseGrbasInput(withoutStatus), null);
  });
});

describe("هویت ارزیاب و مراجع", () => {
  it("۷. فقط متخصص تأییدشده مجاز است", () => {
    assert.equal(isApprovedGrbasEvaluator(null), false);
    assert.equal(isApprovedGrbasEvaluator(undefined), false);
    assert.equal(isApprovedGrbasEvaluator({ status: "PENDING" }), false);
    assert.equal(isApprovedGrbasEvaluator({ status: "REJECTED" }), false);
    assert.equal(isApprovedGrbasEvaluator({ status: "APPROVED" }), true);
  });

  it("۹. شناسه‌های ارزیاب/کاربر از ورودی مرورگر پذیرفته نمی‌شوند", () => {
    for (const forbidden of [
      "evaluator",
      "clinicianId",
      "clinicianProfileId",
      "assessedAt",
      "userId",
      "patientIdExtra",
    ]) {
      assert.equal(
        parseGrbasInput(baseInput({ [forbidden]: "attacker" })),
        null,
        `فیلد غیرمجاز باید رد شود: ${forbidden}`,
      );
    }
    // هویت ارزیاب فقط از آرگومان سمت سرور ساخته می‌شود.
    const input = parseGrbasInput(baseInput());
    assert.ok(input);
    const stored = buildGrbasStored(
      input!,
      { clinicianProfileId: "ckprofile0000000000000000", clinicianUserId: "ckuser00000000000000000", kind: "PHYSICIAN" },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    assert.equal(stored.evaluator.clinicianProfileId, "ckprofile0000000000000000");
    assert.equal(stored.evaluator.clinicianUserId, "ckuser00000000000000000");
    assert.equal(stored.evaluator.kind, "PHYSICIAN");
  });

  it("شناسه‌ی مراجع نامعتبر رد می‌شود", () => {
    assert.equal(parseGrbasInput(baseInput({ patientId: "x" })), null);
    assert.equal(parseGrbasInput(baseInput({ patientId: 123 })), null);
    assert.equal(parseGrbasInput(baseInput({ patientId: "../etc" })), null);
  });
});

describe("کنترل دسترسی", () => {
  it("۸ و ۱۰. دسترسی به نتیجه فقط برای صاحب پرونده یا متخصص دارای مجوز", () => {
    assert.equal(canViewGrbasResult("patient-1", "patient-1", false), true);
    assert.equal(canViewGrbasResult("clinician-1", "patient-1", true), true);
    assert.equal(canViewGrbasResult("clinician-1", "patient-1", false), false);
    assert.equal(canViewGrbasResult(null, "patient-1", true), false);
    assert.equal(canViewGrbasResult("other", "patient-1", false), false);
    assert.equal(canAccessSpeechResult("other", "patient-1"), false);
  });
});

describe("منبع نمونه و توضیحات", () => {
  it("۱۲. منابع معتبر پذیرفته و منبع نامعتبر رد می‌شود", () => {
    for (const source of GRBAS_SAMPLE_SOURCES) {
      const note = source === "OTHER" ? "توضیح منبع" : null;
      const payload = parseGrbasInput(baseInput({ sampleSource: source, sampleNote: note }));
      assert.ok(payload, `منبع ${source} باید پذیرفته شود`);
      assert.equal(payload?.sampleSource, source);
      assert.equal(payload?.sampleNote, note);
    }
    assert.equal(parseGrbasInput(baseInput({ sampleSource: "UNKNOWN" })), null);
    assert.equal(parseGrbasInput(baseInput({ sampleSource: "OTHER", sampleNote: null })), null);
  });

  it("توضیحات طولانی رد می‌شوند", () => {
    const longNote = "a".repeat(GRBAS_MAX_SAMPLE_NOTE_LENGTH + 1);
    const longNotes = "b".repeat(GRBAS_MAX_NOTES_LENGTH + 1);
    assert.equal(parseGrbasInput(baseInput({ sampleNote: longNote })), null);
    assert.equal(parseGrbasInput(baseInput({ notes: longNotes })), null);
    // خالی شدن به null پذیرفته است.
    assert.equal(parseGrbasInput(baseInput({ notes: "   " }))?.notes, null);
    assert.equal(parseGrbasInput(baseInput({ sampleNote: "   " }))?.sampleNote, null);
  });
});

describe("زمان ارزیابی", () => {
  it("۱۱. زمان ارزیابی در سمت سرور ثبت می‌شود", () => {
    const input = parseGrbasInput(baseInput());
    assert.ok(input);
    const fixed = new Date("2026-02-03T04:05:06.000Z");
    const stored = buildGrbasStored(
      input!,
      { clinicianProfileId: "ckprofile0000000000000000", clinicianUserId: "ckuser00000000000000000", kind: "PSYCHOLOGIST" },
      fixed,
    );
    assert.equal(stored.assessedAt, "2026-02-03T04:05:06.000Z");
    const decoded = parseGrbasStored(stored);
    assert.ok(decoded);
    assert.equal(decoded?.assessedAt, "2026-02-03T04:05:06.000Z");
    // زمان نامعتبر رد می‌شود.
    assert.equal(parseGrbasStored({ ...stored, assessedAt: "not-a-date" }), null);
    assert.equal(parseGrbasStored({ ...stored, assessedAt: "2026-02-03T04:05:06.000" }), null);
  });
});

describe("ذخیره و بازیابی", () => {
  it("۱۳. parseGrbasStored شکل کامل را می‌پذیرد و شکل ناقص را رد می‌کند", () => {
    const input = parseGrbasInput(baseInput());
    assert.ok(input);
    const stored = buildGrbasStored(
      input!,
      { clinicianProfileId: "ckprofile0000000000000000", clinicianUserId: "ckuser00000000000000000", kind: "PSYCHOLOGIST" },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const decoded = parseGrbasStored(stored);
    assert.deepEqual(decoded, stored);
    // فیلد ناشناخته (بازنویسی بدون تاریخچه) رد می‌شود.
    assert.equal(parseGrbasStored({ ...stored, diagnosis: "disorder" }), null);
    assert.equal(parseGrbasStored({ ...stored, severity: "severe" }), null);
    assert.equal(parseGrbasStored({ ...stored, total: 10 }), null);
    assert.equal(parseGrbasStored({ ...stored, scores: { ...stored.scores, G: 9 } }), null);
  });

  it("۱۴. هیچ داده‌ی آکوستیکی یا میکروفونی در payload نیست", () => {
    const input = parseGrbasInput(baseInput());
    assert.ok(input);
    const stored = buildGrbasStored(
      input!,
      { clinicianProfileId: "ckprofile0000000000000000", clinicianUserId: "ckuser00000000000000000", kind: "PSYCHOLOGIST" },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    const serialized = JSON.stringify(stored).toLowerCase();
    for (const forbidden of ["audio", "base64", "microphone", "getusermedia", "jitter", "shimmer", "f0", "pitch", "spectral", "audiocontext", "analyser", "waveform"]) {
      assert.equal(serialized.includes(forbidden), false, `فیلد/داده‌ی غیرمجاز: ${forbidden}`);
    }
    assert.equal("attempts" in stored, false);
    assert.equal("samples" in stored, false);
  });
});

describe("کنترل دسترسی و ردیابی در کد", () => {
  it("۷ و ۱۳. سرور فقط create می‌کند و از update استفاده نمی‌کند", () => {
    const source = readSource("../src/server/grbas.ts");
    assert.match(source, /speechResult\.create/);
    assert.doesNotMatch(source, /speechResult\.update|speechResult\.updateMany|\.update\(/);
    assert.match(source, /hasAccess/);
    assert.match(source, /status !== "APPROVED"/);
  });

  it("۱۴. ماژول GRBAS به API میکروفون یا ضبط صوت دسترسی ندارد", () => {
    const files = [
      "../src/components/speech/GrbasRunner.tsx",
      "../src/components/speech/GrbasReport.tsx",
      "../src/app/speech/grbas/page.tsx",
      "../src/app/speech/grbas/result/[id]/page.tsx",
      "../src/lib/speech/grbas-types.ts",
      "../src/lib/speech/grbas-payload.ts",
      "../src/lib/speech/grbas-scoring.ts",
      "../src/server/grbas.ts",
    ];
    const sources = files.map(readSource).join("\n").toLowerCase();
    for (const forbidden of [
      "getusermedia",
      "navigator.mediadevices",
      "mediarecorder",
      "audiocapture",
      "audiocontext",
      "audiocontext",
      "analyser",
      "jitter",
      "shimmer",
      "f0",
      "pitch",
      "spectral",
      "waveform",
    ]) {
      assert.equal(sources.includes(forbidden), false, `غیرمجاز: ${forbidden}`);
    }
  });
});
