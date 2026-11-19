/**
 * تستهای تحلیل MPT با دادههای مصنوعی کنترلشده.
 * اجرا: npm run test:mpt
 * هیچ نمونه صوتی واقعی و هیچ پکیج تست جدیدی مورد استفاده قرار نگرفته است.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MptAnalyzer, framePeak, frameRms, summarizeAttempts } from "../src/lib/speech/mpt-analysis";
import { MPT_CONFIG } from "../src/lib/speech/mpt-config";
import { parseMptPayload, toMptPayload } from "../src/lib/speech/mpt-payload";
import { canAccessSpeechResult } from "../src/lib/speech-result-access";
import type { AudioFrame, MptAttempt } from "../src/lib/speech/mpt-types";

type SignalOptions = {
  onset?: number;
  offset?: number;
  rms?: number;
  noise?: number;
  peak?: number;
  gap?: { start: number; end: number };
  step?: number;
  cap?: number;
};

function signal(options: SignalOptions = {}): AudioFrame[] {
  const step = options.step ?? 25;
  const onset = options.onset ?? 500;
  const offset = options.offset ?? 2500;
  const rms = options.rms ?? 0.05;
  const noise = options.noise ?? 0.001;
  const peak = options.peak ?? Math.min(1, rms * 3);
  const total = options.cap ?? offset + 600;
  const frames: AudioFrame[] = [];

  for (let t = 0; t <= total; t += step) {
    const inVowel = t >= onset && t <= offset;
    const inGap = Boolean(options.gap && t >= options.gap.start && t <= options.gap.end);
    const level = inVowel && !inGap ? rms : noise;
    frames.push({ t, rms: level, peak: level === noise ? noise * 3 : peak });
  }
  return frames;
}

function analyze(frames: AudioFrame[], config: Partial<typeof MPT_CONFIG> = {}) {
  const analyzer = new MptAnalyzer(config);
  for (const frame of frames) analyzer.push(frame);
  if (!analyzer.finished && !analyzer.offsetDetected) analyzer.finish("MANUAL");
  return analyzer.result();
}

describe("پردازش اولیه سیگنال", () => {
  it("RMS و پیک را از نمونههای مصنوعی محاسبه میکند", () => {
    assert.equal(frameRms([0, 0, 0]), 0);
    assert.equal(framePeak([-0.5, 0.25, -0.75]), 0.75);
    assert.ok(Math.abs(frameRms([1, -1, 1, -1]) - 1) < 1e-12);
  });
});

describe("اندازهگیری مدت و تشخیص شروع/پایان", () => {
  it("مدت آواسازی را از شروع واقعی تا پایان اندازه میگیرد", () => {
    const result = analyze(signal({ onset: 500, offset: 2500 }));
    assert.equal(result.durationMs, 2000);
    assert.equal(result.onsetMs, 500);
    assert.equal(result.offsetMs, 2500);
    assert.equal(result.stopReason, "OFFSET");
    assert.equal(result.valid, true);
  });

  it("شروع و پایان را با نویز پیشزمینه متفاوت تشخیص میدهد", () => {
    const result = analyze(signal({ onset: 1000, offset: 3200, noise: 0.004, rms: 0.08 }));
    assert.equal(result.onsetMs, 1000);
    assert.equal(result.offsetMs, 3200);
    assert.equal(result.quality.ok, true);
  });
});

describe("کیفیت سیگنال", () => {
  it("سکوت طولانی در میانه را بدون پایان دادن زودهنگام تشخیص میدهد", () => {
    const result = analyze(signal({ gap: { start: 1200, end: 1450 } }));
    assert.ok(result.quality.issues.includes("LONG_INTERNAL_SILENCE"));
    assert.ok(result.quality.internalSilenceMs >= MPT_CONFIG.maxInternalSilenceMs);
    assert.equal(result.durationMs, 2000);
    assert.equal(result.valid, false);
  });

  it("نبود داده صوتی را نامعتبر میکند", () => {
    const analyzer = new MptAnalyzer();
    analyzer.finish("MANUAL");
    const result = analyzer.result();
    assert.equal(result.valid, false);
    assert.equal(result.durationMs, null);
    assert.equal(result.onsetMs, null);
    assert.deepEqual(result.quality.issues, ["NO_SIGNAL"]);
  });

  it("سیگنال ضعیف را تشخیص میدهد", () => {
    const result = analyze(signal({ rms: 0.01, peak: 0.02, noise: 0.0005 }));
    assert.ok(result.quality.issues.includes("WEAK_SIGNAL"));
    assert.equal(result.valid, false);
  });

  it("اشباع شدید سیگنال را تشخیص میدهد", () => {
    const result = analyze(signal({ rms: 0.5, peak: 0.995 }));
    assert.ok(result.quality.issues.includes("CLIPPING"));
    assert.ok(result.quality.clippedRatio > 0.05);
    assert.equal(result.valid, false);
  });

  it("آواسازی خیلی کوتاه را نامعتبر میکند", () => {
    const result = analyze(signal({ onset: 500, offset: 650 }));
    assert.ok(result.quality.issues.includes("TOO_SHORT"));
    assert.equal(result.valid, false);
  });
});

describe("توقف دستی و سقف ایمن", () => {
  it("توقف دستی در میانه آواسازی را ناقص علامتگذاری میکند", () => {
    const analyzer = new MptAnalyzer();
    for (const frame of signal({ onset: 500, offset: 5000, cap: 1500 })) analyzer.push(frame);
    analyzer.finish("MANUAL");
    const result = analyzer.result();
    assert.equal(result.stopReason, "MANUAL");
    assert.ok(result.quality.issues.includes("TRUNCATED"));
    assert.equal(result.durationMs, 1000);
    assert.equal(result.valid, false);
  });

  it("توقف دستی پس از پایان طبیعی، نتیجه معتبر باقی میماند", () => {
    const analyzer = new MptAnalyzer();
    for (const frame of signal()) analyzer.push(frame);
    assert.equal(analyzer.offsetDetected, true);
    analyzer.finish("MANUAL");
    const result = analyzer.result();
    assert.equal(result.stopReason, "OFFSET");
    assert.equal(result.valid, true);
  });

  it("سقف زمانی بهطور خودکار متوقف میشود", () => {
    const analyzer = new MptAnalyzer({ maxDurationMs: 1000, baselineMs: 150 });
    for (const frame of signal({ onset: 200, offset: 5000, cap: 1200 })) analyzer.push(frame);
    assert.equal(analyzer.finished, true);
    const result = analyzer.result();
    assert.equal(result.stopReason, "CAP");
    assert.ok(result.durationMs !== null && result.durationMs <= 1000);
  });
});

describe("خلاصه تلاشها", () => {
  function attempt(durationMs: number | null, valid = true): MptAttempt {
    const result = analyze(
      durationMs === null ? [] : signal({ onset: 500, offset: 500 + durationMs }),
    );
    return valid
      ? { ...result, valid: true, durationMs }
      : { ...result, valid: false, durationMs, quality: { ...result.quality, ok: false, issues: ["TOO_SHORT"] } };
  }

  it("تلاش نامعتبر را از میانگین حذف میکند", () => {
    const summary = summarizeAttempts([attempt(1000), attempt(3000, false), attempt(2000)]);
    assert.equal(summary.validCount, 2);
    assert.equal(summary.bestMs, 2000);
    assert.equal(summary.averageMs, 1500);
  });

  it("با یک تلاش معتبر، میانگین همان مقدار است", () => {
    const summary = summarizeAttempts([attempt(1234, false), attempt(1700)]);
    assert.equal(summary.validCount, 1);
    assert.equal(summary.averageMs, 1700);
    assert.equal(summary.bestMs, 1700);
  });

  it("حداکثر سه تلاش را خلاصه میکند", () => {
    const summary = summarizeAttempts([attempt(1000), attempt(2000), attempt(3000)]);
    assert.equal(summary.attempts.length, 3);
    assert.equal(summary.validCount, 3);
    assert.equal(summary.bestMs, 3000);
    assert.equal(summary.averageMs, 2000);
  });

  it("اگر هیچ تلاش معتبری نباشد، میانگین و بهترین خالی میمانند", () => {
    const summary = summarizeAttempts([attempt(1000, false), attempt(2000, false)]);
    assert.equal(summary.validCount, 0);
    assert.equal(summary.averageMs, null);
    assert.equal(summary.bestMs, null);
  });
});

describe("ذخیره امن نتیجه", () => {
  const payload = toMptPayload(summarizeAttempts([analyze(signal())]));

  it("فیلد صوت خام یا فیلد ناشناخته را رد میکند", () => {
    assert.equal(parseMptPayload({ ...payload, audio: "base64..." }), null);
    assert.equal(parseMptPayload({ ...payload, audioUrl: "/uploads/voice.webm" }), null);
    assert.notEqual(parseMptPayload(payload), null);
  });

  it("محاسبههای دستکاریشده را رد میکند", () => {
    assert.equal(parseMptPayload({ ...payload, averageMs: 999999 }), null);
    assert.equal(parseMptPayload({ ...payload, validCount: 7 }), null);
    assert.equal(parseMptPayload({ ...payload, version: 2 }), null);
  });
});

describe("دسترسی به نتیجه", () => {
  it("فقط صاحب نتیجه اجازه دارد", () => {
    assert.equal(canAccessSpeechResult("user-1", "user-1"), true);
    assert.equal(canAccessSpeechResult("user-2", "user-1"), false);
    assert.equal(canAccessSpeechResult(null, "user-1"), false);
    assert.equal(canAccessSpeechResult(undefined, "user-1"), false);
  });
});
