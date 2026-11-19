/**
 * تستهای تحلیل واکه پایدار با سیگنالهای مصنوعی کاملاً کنترلشده.
 * اجرا: npm run test:sustained-vowel
 * هیچ میکروفون واقعی، فایل صوتی یا پکیج تست جدیدی مورد استفاده قرار نگرفته است.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SustainedVowelAnalyzer, estimateF0, summarizeSustainedAttempts } from "../src/lib/speech/sustained-vowel-analysis";
import { SUSTAINED_VOWEL_CONFIG } from "../src/lib/speech/sustained-vowel-config";
import { parseSustainedVowelPayload, toSustainedVowelPayload } from "../src/lib/speech/sustained-vowel-payload";
import { canAccessSpeechResult } from "../src/lib/speech-result-access";
import type { AudioFrame } from "../src/lib/speech/mpt-types";
import type { SustainedVowelConfig } from "../src/lib/speech/sustained-vowel-config";
import type { SustainedVowelAttempt } from "../src/lib/speech/sustained-vowel-types";

const SAMPLE_RATE = 16_000;
const FRAME_LENGTH = 1024;

let randomState = 12345;
function random(): number {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0xffffffff;
}

type ToneOptions = {
  t: number;
  freq: number;
  amp: number;
  noise?: number;
  clip?: boolean;
};

function makeFrame({ t, freq, amp, noise = 0.0002, clip = false }: ToneOptions): {
  frame: AudioFrame;
  samples: Float32Array;
} {
  const samples = new Float32Array(FRAME_LENGTH);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < FRAME_LENGTH; i++) {
    let value = freq > 0 ? amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) : 0;
    value += (random() - 0.5) * 2 * noise;
    if (clip) value = Math.max(-1, Math.min(1, value));
    samples[i] = value;
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  return { frame: { t, rms: Math.sqrt(sum / FRAME_LENGTH), peak }, samples };
}

type SignalOptions = {
  onset?: number;
  offset?: number;
  total?: number;
  step?: number;
  freq?: number | ((t: number) => number);
  amp?: number;
  noise?: number;
  gap?: { start: number; end: number };
  clip?: boolean;
  sampleRate?: number;
};

type SyntheticFrame = { frame: AudioFrame; samples: Float32Array; sampleRate: number };

function makeSignal(options: SignalOptions = {}): SyntheticFrame[] {
  const onset = options.onset ?? 500;
  const offset = options.offset ?? 6500;
  const total = options.total ?? 7000;
  const step = options.step ?? 25;
  const amp = options.amp ?? 0.08;
  const noise = options.noise ?? 0.0002;
  const sampleRate = options.sampleRate ?? SAMPLE_RATE;
  const frames: SyntheticFrame[] = [];

  for (let t = 0; t <= total; t += step) {
    const inVowel = t >= onset && t <= offset;
    const inGap = Boolean(options.gap && t >= options.gap.start && t <= options.gap.end);
    const freq = inVowel && !inGap ? (typeof options.freq === "function" ? options.freq(t) : (options.freq ?? 120)) : 0;
    const level = inVowel && !inGap ? amp : 0;
    const generated = makeFrame({ t, freq, amp: level, noise, clip: options.clip && inVowel && !inGap });
    frames.push({ ...generated, sampleRate });
  }
  return frames;
}

function analyze(
  frames: SyntheticFrame[],
  config: Partial<SustainedVowelConfig> = {},
  baseline: AudioFrame[] = [],
): SustainedVowelAttempt {
  const analyzer = new SustainedVowelAnalyzer(config, baseline);
  for (const item of frames) analyzer.push(item.frame, item.samples, item.sampleRate);
  analyzer.finish();
  return analyzer.result();
}

function baselineFrom(frames: SyntheticFrame[], untilMs: number): AudioFrame[] {
  return frames.filter((item) => item.frame.t < untilMs).map((item) => item.frame);
}

describe("تخمین فرکانس پایه", () => {
  it("F0 را برای واکه مصنوعی با دقت قابل قبول تخمین میزند", () => {
    const { samples } = makeFrame({ t: 0, freq: 120, amp: 0.08 });
    const result = estimateF0(samples, SAMPLE_RATE);
    assert.notEqual(result, null);
    assert.ok(Math.abs((result as number) - 120) <= 3, `F0=${result}`);
  });

  it("فرکانسهای مختلف را تشخیص میدهد", () => {
    for (const freq of [90, 180, 250, 350]) {
      const { samples } = makeFrame({ t: 0, freq, amp: 0.08 });
      const result = estimateF0(samples, SAMPLE_RATE);
      assert.notEqual(result, null, `freq=${freq}`);
      assert.ok(Math.abs((result as number) - freq) <= 4, `freq=${freq} -> ${result}`);
    }
  });

  it("با نرخ نمونهبرداری نامعتبر، F0 نامعتبر برمیگرداند", () => {
    const { samples } = makeFrame({ t: 0, freq: 120, amp: 0.08 });
    assert.equal(estimateF0(samples, 3000), null);
    assert.equal(estimateF0(samples, Number.NaN), null);
  });

  it("با نمونه ناکافی یا داده ناقص، F0 نامعتبر برمیگرداند", () => {
    assert.equal(estimateF0(new Float32Array(8), SAMPLE_RATE), null);
    assert.equal(estimateF0([0, Number.NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], SAMPLE_RATE), null);
  });
});

describe("تحلیل واکه پایدار", () => {
  it("یک واکه مصنوعی پایدار را معتبر تشخیص میدهد", () => {
    const frames = makeSignal();
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    assert.equal(result.valid, true, JSON.stringify(result.issues));
    assert.deepEqual(result.issues, []);
    assert.notEqual(result.f0, null);
    assert.notEqual(result.amplitude, null);
    assert.ok(result.stableMs >= 1000);
  });

  it("سیگنال بدون آواسازی را رد میکند", () => {
    const frames = makeSignal({ onset: 1_000_000, offset: 1_000_001 });
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    assert.equal(result.valid, false);
    assert.ok(result.issues.includes("NO_SIGNAL"));
    assert.equal(result.f0, null);
  });

  it("سیگنال ضعیف را تشخیص میدهد", () => {
    const frames = makeSignal({ amp: 0.005, noise: 0.0001 });
    const result = analyze(frames, { onsetThresholdRms: 0.001 }, baselineFrom(frames, 500));
    assert.ok(result.issues.includes("WEAK_SIGNAL"), JSON.stringify(result.issues));
    assert.equal(result.valid, false);
  });

  it("اشباع شدید سیگنال را تشخیص میدهد", () => {
    const frames = makeSignal({ amp: 1.6, clip: true });
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    assert.ok(result.issues.includes("CLIPPING"), JSON.stringify(result.issues));
    assert.ok(result.quality.clippedRatio > 0.05);
  });

  it("وقفه طولانی درون آواسازی را تشخیص میدهد", () => {
    const frames = makeSignal({
      onset: 500,
      offset: 2500,
      total: 3200,
      gap: { start: 1000, end: 1350 },
    });
    const result = analyze(
      frames,
      { maxAmplitudeCv: 3, minVoicedRatio: 0, stableWindowMs: 1200 },
      baselineFrom(frames, 500),
    );
    assert.ok(result.issues.includes("LONG_INTERNAL_SILENCE"), JSON.stringify(result.issues));
    assert.ok(result.quality.internalSilenceMs >= 200);
  });

  it("بازه پایدار، ابتدا و انتهای آواسازی را حذف میکند", () => {
    const frames = makeSignal({ onset: 1000, offset: 6000, total: 6800 });
    const result = analyze(frames, {}, baselineFrom(frames, 1000));
    assert.equal(result.valid, true, JSON.stringify(result.issues));
    assert.ok((result.stableStartMs as number) >= 1000 + SUSTAINED_VOWEL_CONFIG.edgeTrimMs);
    assert.ok((result.stableEndMs as number) <= 6000 - SUSTAINED_VOWEL_CONFIG.edgeTrimMs + 25);
    assert.ok((result.stableEndMs as number) > (result.stableStartMs as number));
  });

  it("بخش پایدار میانی را نسبت به لبههای ناپایدار انتخاب میکند", () => {
    // شدت در ۸۰۰ میلیثانیه ابتدا و انتها بهتدریج تغییر میکند؛ میانه ثابت است.
    const frames = makeSignal({ onset: 500, offset: 6500, total: 7000 });
    for (const item of frames) {
      const t = item.frame.t;
      if (t >= 500 && t < 1300) {
        const factor = 0.25 + (0.75 * (t - 500)) / 800;
        for (let i = 0; i < item.samples.length; i++) item.samples[i] *= factor;
        item.frame.rms *= factor;
        item.frame.peak *= factor;
      } else if (t > 5700 && t <= 6500) {
        const factor = 0.25 + (0.75 * (6500 - t)) / 800;
        for (let i = 0; i < item.samples.length; i++) item.samples[i] *= factor;
        item.frame.rms *= factor;
        item.frame.peak *= factor;
      }
    }
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    assert.equal(result.valid, true, JSON.stringify(result.issues));
    assert.ok((result.stableStartMs as number) >= 1300 - 25, `start=${result.stableStartMs}`);
    assert.ok((result.stableEndMs as number) <= 5700 + 25, `end=${result.stableEndMs}`);
  });

  it("بازه کوتاه و ناپایدار را رد میکند", () => {
    const frames = makeSignal({ onset: 500, offset: 900, total: 1500 });
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    assert.equal(result.valid, false);
    assert.ok(result.issues.includes("NO_STABLE_SEGMENT"));
    assert.ok(result.issues.includes("TOO_SHORT"));
  });

  it("انحراف معیار F0 را برای تغییر فرکانس محاسبه میکند", () => {
    const frames = makeSignal({
      onset: 500,
      offset: 6500,
      total: 7000,
      freq: (t) => 110 + ((t - 500) / 6000) * 40,
    });
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    assert.equal(result.valid, true, JSON.stringify(result.issues));
    assert.notEqual(result.f0, null);
    assert.ok((result.f0 as { stdHz: number }).stdHz > 1, JSON.stringify(result.f0));
    assert.ok((result.f0 as { series: unknown[] }).series.length > 1);
    assert.notEqual((result.f0 as { slopeHzPerSec: number }).slopeHzPerSec, 0);
  });

  it("F0 نامعتبر را null نگه میدارد و آن را صفر نمینویسد", () => {
    const frames = makeSignal({ sampleRate: 3000 });
    const result = analyze(frames, {}, baselineFrom(frames, 500));
    const displayedValue = result.f0 === null ? null : result.f0.meanHz;
    assert.equal(displayedValue, null);
    assert.ok(result.issues.includes("INVALID_SAMPLE_RATE"));
    assert.notEqual(displayedValue, 0);
  });

  it("داده ناقص را بدون تولید عدد ساختگی رد میکند", () => {
    const frames = makeSignal().slice(0, 3);
    const result = analyze(frames, {}, baselineFrom(frames, 100));
    assert.equal(result.valid, false);
    assert.equal(result.f0, null);
    assert.equal(result.amplitude, null);
    assert.equal(result.stableMs, 0);
  });
});

describe("خلاصه تلاشها", () => {
  function validAttempt(freq: number): SustainedVowelAttempt {
    const frames = makeSignal({ freq });
    return analyze(frames, {}, baselineFrom(frames, 500));
  }

  it("چند تلاش معتبر را خلاصه میکند", () => {
    const summary = summarizeSustainedAttempts([validAttempt(110), validAttempt(130), validAttempt(150)]);
    assert.equal(summary.validCount, 3);
    assert.ok(summary.f0MeanHz !== null && summary.f0MeanHz > 100 && summary.f0MeanHz < 160);
    assert.ok(summary.stableMs !== null && summary.stableMs >= 1000);
  });

  it("تلاش نامعتبر را از میانگین حذف میکند", () => {
    const bad = makeSignal({ onset: 500, offset: 900, total: 1500 });
    const badAttempt = analyze(bad, {}, baselineFrom(bad, 500));
    const summary = summarizeSustainedAttempts([validAttempt(120), badAttempt]);
    assert.equal(summary.validCount, 1);
    assert.equal(summary.f0MeanHz, badAttempt === null ? null : summarizeSustainedAttempts([validAttempt(120)]).f0MeanHz);
  });
});

describe("ذخیره و دسترسی ایمن", () => {
  const payload = toSustainedVowelPayload(
    summarizeSustainedAttempts([
      analyze(makeSignal(), {}, baselineFrom(makeSignal(), 500)),
    ]),
  );

  it("پیام معتبر را میپذیرد", () => {
    assert.notEqual(parseSustainedVowelPayload(payload), null);
  });

  it("فیلد صوت خام یا فیلد ناشناخته را رد میکند", () => {
    assert.equal(parseSustainedVowelPayload({ ...payload, audio: "base64..." }), null);
    assert.equal(parseSustainedVowelPayload({ ...payload, audioUrl: "/uploads/a.webm" }), null);
    assert.equal(
      parseSustainedVowelPayload({
        ...payload,
        attempts: [{ ...payload.attempts[0], samples: [0.1, 0.2] }],
      }),
      null,
    );
  });

  it("بیش از سه تلاش و تلاش خالی را رد میکند", () => {
    const four = Array.from({ length: 4 }, () => payload.attempts[0]);
    const changed = toSustainedVowelPayload(summarizeSustainedAttempts(four));
    assert.equal(parseSustainedVowelPayload(changed), null);
    assert.equal(parseSustainedVowelPayload({ ...payload, attempts: [] }), null);
  });

  it("شاخصهای دستکاریشده را رد میکند", () => {
    assert.equal(parseSustainedVowelPayload({ ...payload, validCount: 99 }), null);
    assert.equal(parseSustainedVowelPayload({ ...payload, version: 2 }), null);
    assert.equal(parseSustainedVowelPayload({ ...payload, f0MeanHz: 9999 }), null);
  });

  it("فقط صاحب نتیجه اجازه مشاهده دارد", () => {
    assert.equal(canAccessSpeechResult("user-1", "user-1"), true);
    assert.equal(canAccessSpeechResult("user-2", "user-1"), false);
    assert.equal(canAccessSpeechResult(null, "user-1"), false);
  });
});
