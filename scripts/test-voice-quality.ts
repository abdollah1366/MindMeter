/**
 * تستهای خودکار ارزیابی کیفیت صوت با سیگنالهای مصنوعی کنترلشده.
 * اجرا: npm run test:voice-quality
 *
 * هیچ میکروفون، فایل صوتی یا سرویس خارجی درگیر نیست. تمام سیگنالها بهصورت
 * deterministic و محلی ساخته میشوند.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VoiceQualityAnalyzer,
  computeHnrDb,
  computeJitterPercent,
  computeShimmerPercent,
  estimateVoiceF0,
  extractVoiceCycles,
  summarizeVoiceSamples,
} from "../src/lib/speech/voice-quality-analysis";
import { VOICE_QUALITY_CONFIG } from "../src/lib/speech/voice-quality-config";
import { parseVoiceQualityPayload, toVoiceQualityPayload } from "../src/lib/speech/voice-quality-payload";
import { parseMptPayload } from "../src/lib/speech/mpt-payload";
import { parseSustainedVowelPayload } from "../src/lib/speech/sustained-vowel-payload";
import { estimateF0 } from "../src/lib/speech/sustained-vowel-analysis";
import { canAccessSpeechResult } from "../src/lib/speech-result-access";
import type { AudioFrame } from "../src/lib/speech/mpt-types";
import type { VoiceSampleAttempt, VoiceSampleKind } from "../src/lib/speech/voice-quality-types";

const SAMPLE_RATE = 16_000;
const FRAME_INTERVAL = VOICE_QUALITY_CONFIG.frameIntervalMs;
const SAMPLES_PER_FRAME = 1024;

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type SignalOptions = {
  durationMs: number;
  kind?: VoiceSampleKind;
  freq?: number | ((tSec: number) => number);
  amplitude?: number;
  noiseRms?: number;
  clip?: boolean;
  sampleRate?: number;
};

type SyntheticBuffer = { frame: AudioFrame; samples: Float32Array; sampleRate: number };

function makeSignal(options: SignalOptions): SyntheticBuffer[] {
  const random = lcg(12345);
  const result: SyntheticBuffer[] = [];
  const total = Math.floor(options.durationMs / FRAME_INTERVAL);
  const amplitude = options.amplitude ?? 0.25;
  const noiseRms = options.noiseRms ?? 0;
  const noiseAmplitude = noiseRms * Math.sqrt(3);
  let phase = 0;

  for (let i = 0; i < total; i++) {
    const t = i * FRAME_INTERVAL;
    const hz = typeof options.freq === "function" ? options.freq(t / 1000) : (options.freq ?? 120);
    const samples = new Float32Array(SAMPLES_PER_FRAME);
    let sumSquares = 0;
    let peak = 0;
    for (let j = 0; j < SAMPLES_PER_FRAME; j++) {
      phase += (2 * Math.PI * hz) / SAMPLE_RATE;
      let value = Math.sin(phase) * amplitude;
      if (noiseAmplitude > 0) value += (random() * 2 - 1) * noiseAmplitude;
      if (options.clip) value = Math.max(-1, Math.min(1, value));
      samples[j] = value;
      sumSquares += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    result.push({
      frame: { t, rms: Math.sqrt(sumSquares / SAMPLES_PER_FRAME), peak },
      samples,
      sampleRate: options.sampleRate ?? SAMPLE_RATE,
    });
  }
  return result;
}

function makeBaseline(rms: number, count = 12): AudioFrame[] {
  return Array.from({ length: count }, (_, i) => ({ t: i * FRAME_INTERVAL, rms, peak: rms * 1.4 }));
}

function analyze(options: SignalOptions, baseline: AudioFrame[] = makeBaseline(0.004)): VoiceSampleAttempt {
  const analyzer = new VoiceQualityAnalyzer({}, options.kind ?? "vowel", baseline);
  for (const buffer of makeSignal(options)) analyzer.push(buffer.frame, buffer.samples, buffer.sampleRate);
  analyzer.finish();
  return analyzer.result();
}

function pureSine(hz = 120, length = 2048, noiseRms = 0): Float32Array {
  const random = lcg(999);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] =
      Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE) * 0.25 +
      (noiseRms > 0 ? (random() * 2 - 1) * noiseRms * Math.sqrt(3) : 0);
  }
  return samples;
}

describe("۱. تخمین فرکانس پایه", () => {
  it("F0 یک واکه مصنوعی را با دقت قابل قبول تخمین میزند", () => {
    const hz = estimateVoiceF0(pureSine(120), SAMPLE_RATE);
    assert.equal(hz !== null, true);
    assert.ok(Math.abs((hz as number) - 120) <= 2, `F0=${hz}`);
  });

  it("F0 فرکانسهای مختلف را تشخیص میدهد", () => {
    for (const target of [95, 150, 220]) {
      const hz = estimateVoiceF0(pureSine(target), SAMPLE_RATE);
      assert.ok(hz !== null && Math.abs(hz - target) <= 3, `target=${target} got=${hz}`);
    }
  });

  it("نرخ نمونهبرداری نامعتبر و سکوت، F0 نامعتبر میدهند", () => {
    assert.equal(estimateVoiceF0(pureSine(120), 4000), null);
    assert.equal(estimateVoiceF0(new Float32Array(1024), SAMPLE_RATE), null);
  });
});

describe("۲. تحلیل سیگنال واکه پایدار", () => {
  it("یک واکه پایدار معتبر، شاخصهای واقعی و سری نمودار تولید میکند", () => {
    const attempt = analyze({ durationMs: 2000, kind: "vowel", noiseRms: 0.025 });
    assert.equal(attempt.kind, "vowel");
    assert.equal(attempt.valid, true, JSON.stringify(attempt.issues));
    assert.deepEqual(attempt.issues, []);
    assert.ok(attempt.voicedMs !== null && attempt.voicedMs > 800);
    assert.ok(attempt.f0MeanHz !== null && Math.abs(attempt.f0MeanHz - 120) <= 3);
    assert.ok(attempt.f0StdHz !== null && attempt.f0StdHz < 10);
    assert.ok(attempt.f0Series.length >= 2);
    assert.ok(attempt.amplitudeSeries.length >= 2);
    assert.ok(attempt.jitterPercent !== null && attempt.jitterPercent >= 0 && attempt.jitterPercent < 10);
    assert.ok(attempt.shimmerPercent !== null && attempt.shimmerPercent >= 0 && attempt.shimmerPercent < 20);
    assert.ok(attempt.hnrDb !== null && attempt.hnrDb > 0 && attempt.hnrDb < 60);
    assert.ok(attempt.spectralCentroidHz !== null && attempt.spectralCentroidHz < 1000);
    assert.ok(attempt.highFrequencyRatio !== null && attempt.highFrequencyRatio >= 0);
  });
});

describe("۳. تحلیل گفتار پیوسته و جداسازی نمونهها", () => {
  it("روند تغییر F0 را در گفتار پیوسته اندازه میگیرد", () => {
    const attempt = analyze({
      durationMs: 3000,
      kind: "reading",
      freq: (t) => 110 + t * 7,
      noiseRms: 0.02,
    });
    assert.equal(attempt.kind, "reading");
    assert.equal(attempt.valid, true, JSON.stringify(attempt.issues));
    assert.ok(attempt.f0SlopeHzPerSec !== null && attempt.f0SlopeHzPerSec > 2, `slope=${attempt.f0SlopeHzPerSec}`);
  });

  it("خلاصهسازی، نمونهها را جداگانه و بدون مخلوط شدن نگه میدارد", () => {
    const vowel = analyze({ durationMs: 1600, kind: "vowel", noiseRms: 0.025 });
    const reading = analyze({ durationMs: 2400, kind: "reading", freq: (t) => 115 + t * 5, noiseRms: 0.02 });
    const free = analyze({ durationMs: 1800, kind: "free", freq: 140, noiseRms: 0.02 });
    const summary = summarizeVoiceSamples([reading, vowel, free]);
    assert.equal(summary.samples.length, 3);
    assert.deepEqual(
      summary.samples.map((sample) => sample.kind),
      ["vowel", "reading", "free"],
    );
    for (const sample of summary.samples) {
      assert.equal(sample.attempts.length, 1);
      assert.equal(sample.attempts[0].kind, sample.kind);
    }
    assert.equal(summary.validSampleCount, 3);
    assert.ok(summary.samples[1].f0SlopeHzPerSec !== null);
  });
});

describe("۴ تا ۶. Jitter، Shimmer و HNR در شرایط معتبر", () => {
  it("Jitter از دورههای معتبر محاسبه و با دوره ناکافی نامعتبر میشود", () => {
    const samples = pureSine(130, 4096, 0.02);
    const cycles = extractVoiceCycles(samples, SAMPLE_RATE, 130);
    assert.ok(cycles.length >= VOICE_QUALITY_CONFIG.minCycles, `cycles=${cycles.length}`);
    const jitter = computeJitterPercent(cycles);
    assert.ok(jitter !== null && jitter >= 0 && jitter < 5, `jitter=${jitter}`);
    assert.equal(computeJitterPercent(cycles.slice(0, 3)), null);
  });

  it("Shimmer از دامنه دورههای معتبر محاسبه میشود", () => {
    const samples = pureSine(130, 4096, 0.02);
    const cycles = extractVoiceCycles(samples, SAMPLE_RATE, 130);
    const shimmer = computeShimmerPercent(cycles);
    assert.ok(shimmer !== null && shimmer >= 0 && shimmer < 15, `shimmer=${shimmer}`);
    assert.equal(computeShimmerPercent(cycles.slice(0, 2)), null);
  });

  it("HNR برای سیگنال نویزی periodic معتبر و برای سیگنال کاملاً تکفام نامعتبر است", () => {
    const hnr = computeHnrDb(pureSine(120, 4096, 0.025), SAMPLE_RATE, 120);
    assert.ok(hnr !== null && hnr > 5 && hnr < 40, `hnr=${hnr}`);
    // همبستگی نزدیک به ۱ در سینوس خالص، شرط اعتبار HNR را نقض میکند؛ صفر ساختگی نیست.
    assert.equal(computeHnrDb(pureSine(120, 4096, 0), SAMPLE_RATE, 120), null);
  });
});

describe("۷ تا ۱۰. کیفیت ضبط، نویز و نبود آواسازی", () => {
  it("سیگنال ضعیف، نامعتبر تشخیص داده میشود و مقادیر عددی ساختگی نمیدهد", () => {
    const attempt = analyze({ durationMs: 1600, kind: "vowel", amplitude: 0.001 });
    assert.equal(attempt.valid, false);
    assert.ok(attempt.issues.includes("WEAK_SIGNAL") || attempt.issues.includes("NO_SIGNAL"));
    assert.equal(attempt.f0MeanHz, null);
    assert.equal(attempt.jitterPercent, null);
    assert.equal(attempt.hnrDb, null);
  });

  it("clipping تشخیص داده میشود", () => {
    const attempt = analyze({ durationMs: 1600, kind: "vowel", amplitude: 1.5, clip: true });
    assert.equal(attempt.valid, false);
    assert.ok(attempt.issues.includes("CLIPPING"), JSON.stringify(attempt.issues));
  });

  it("نویز بالای پیشزمینه و نویز غالب بهدرستی مدیریت میشوند", () => {
    const highFloor = analyze(
      { durationMs: 1600, kind: "vowel", noiseRms: 0.025 },
      makeBaseline(0.09),
    );
    assert.ok(highFloor.issues.includes("HIGH_NOISE"));
    assert.equal(highFloor.valid, false);

    const random = lcg(777);
    const noise = new Float32Array(4096);
    for (let i = 0; i < noise.length; i++) noise[i] = random() * 2 - 1;
    assert.equal(computeHnrDb(noise, SAMPLE_RATE, 120), null);
  });

  it("سیگنال بدون آواسازی، همه شاخصها را نامعتبر میکند", () => {
    const attempt = analyze({ durationMs: 1600, kind: "vowel", amplitude: 0, noiseRms: 0 });
    assert.equal(attempt.valid, false);
    assert.ok(attempt.issues.includes("NO_SIGNAL"));
    assert.ok(attempt.issues.includes("NO_VOICED_FRAMES"));
    assert.equal(attempt.voicedMs, null);
    assert.equal(attempt.f0MeanHz, null);
    assert.equal(attempt.f0StdHz, null);
    assert.equal(attempt.jitterPercent, null);
    assert.equal(attempt.shimmerPercent, null);
    assert.equal(attempt.hnrDb, null);
    assert.equal(attempt.spectralCentroidHz, null);
    assert.equal(attempt.f0Series.length, 0);
    assert.ok(attempt.unmeasurable.length >= 5);
  });
});

describe("۱۱ تا ۱۳. داده ناقص، نمونهبرداری و مقادیر ساختگی", () => {
  it("تحلیلگر بدون فریم، وضعیت ناقص و دلیل عدم محاسبه را ثبت میکند", () => {
    const analyzer = new VoiceQualityAnalyzer({}, "vowel", []);
    analyzer.finish();
    const attempt = analyzer.result();
    assert.equal(attempt.valid, false);
    assert.ok(attempt.issues.includes("INCOMPLETE_DATA"));
    assert.equal(attempt.recordedMs, 0);
    assert.equal(attempt.f0MeanHz, null);
    assert.ok(attempt.unmeasurable.some((item) => item.metric === "همه شاخصها"));
    assert.equal(parseVoiceQualityPayload(toVoiceQualityPayload(summarizeVoiceSamples([attempt]))), null);
  });

  it("نرخ نمونهبرداری نامعتبر، F0 و طیف را نامعتبر میکند", () => {
    const attempt = analyze({ durationMs: 1600, kind: "vowel", sampleRate: 4000 });
    assert.ok(attempt.issues.includes("INVALID_SAMPLE_RATE"));
    assert.equal(attempt.f0MeanHz, null);
    assert.equal(attempt.spectralCentroidHz, null);
    assert.equal(attempt.hnrDb, null);
  });

  it("مقادیر غیرممکن و فیلدهای نمره/تشخیص توسط اعتبارسنج رد میشوند", () => {
    const valid = analyze({ durationMs: 2000, kind: "vowel", noiseRms: 0.025 });
    const payload = toVoiceQualityPayload(summarizeVoiceSamples([valid]));
    assert.notEqual(parseVoiceQualityPayload(payload), null);

    const forged = structuredClone(payload);
    forged.samples[0].jitterPercent = 999999;
    assert.equal(parseVoiceQualityPayload(forged), null);

    const scored = { ...payload, overallScore: 95 };
    assert.equal(parseVoiceQualityPayload(scored), null);

    const withDiagnosis = structuredClone(payload);
    (withDiagnosis as unknown as Record<string, unknown>).diagnosis = "disorder";
    assert.equal(parseVoiceQualityPayload(withDiagnosis), null);

    const text = JSON.stringify(payload);
    for (const forbidden of ["overallScore", "diagnosis", "base64", "audio", "normal/abnormal"]) {
      assert.equal(text.includes(forbidden), false, `forbidden field: ${forbidden}`);
    }
  });
});

describe("۱۴. عدم ذخیره صوت خام", () => {
  it("پیام حاوی نمونه خام یا مسیر فایل رد میشود", () => {
    const valid = analyze({ durationMs: 1600, kind: "vowel", noiseRms: 0.025 });
    const payload = toVoiceQualityPayload(summarizeVoiceSamples([valid])) as unknown as Record<string, unknown>;
    for (const key of ["audio", "rawAudio", "audioUrl", "samples", "sampleRate", "userId"]) {
      assert.equal(parseVoiceQualityPayload({ ...payload, [key]: "DATA" }), null, `key=${key}`);
    }
    const nested = structuredClone(payload);
    const nestedSamples = nested.samples as unknown as Record<string, unknown>[];
    nestedSamples[0].samples = [0.1, 0.2];
    assert.equal(parseVoiceQualityPayload(nested), null);
  });
});

describe("۱۵. کنترل مالکیت نتایج", () => {
  it("دسترسی فقط برای مالک همان نتیجه مجاز است", () => {
    assert.equal(canAccessSpeechResult("user-1", "user-1"), true);
    assert.equal(canAccessSpeechResult("user-2", "user-1"), false);
    assert.equal(canAccessSpeechResult(null, "user-1"), false);
    assert.equal(canAccessSpeechResult("", "user-1"), false);
  });

  it("شناسه کاربر در payload پذیرفته نمیشود", () => {
    const valid = analyze({ durationMs: 1600, kind: "vowel", noiseRms: 0.025 });
    const payload = toVoiceQualityPayload(summarizeVoiceSamples([valid])) as unknown as Record<string, unknown>;
    assert.equal(parseVoiceQualityPayload({ ...payload, userId: "attacker" }), null);
  });
});

describe("۱۶. جلوگیری از تداخل آزمونهای دیگر", () => {
  it("اعتبارسنج MPT و واکه پایدار، payload کیفیت صوت را رد میکنند و بالعکس", () => {
    const valid = analyze({ durationMs: 1600, kind: "vowel", noiseRms: 0.025 });
    const voicePayload = toVoiceQualityPayload(summarizeVoiceSamples([valid]));
    assert.equal(parseMptPayload(voicePayload), null);
    assert.equal(parseSustainedVowelPayload(voicePayload), null);
    const foreign = {
      key: "mpt",
      version: 1,
      attempts: [],
      validCount: 0,
      bestMs: null,
      averageMs: null,
    };
    assert.equal(parseVoiceQualityPayload(foreign), null);
  });

  it("اجرای تحلیل جدید، تخمین F0 آزمون واکه پایدار را تغییر نمیدهد", () => {
    const before = estimateF0(pureSine(120), SAMPLE_RATE);
    const analyzer = new VoiceQualityAnalyzer({}, "free", []);
    const buffer = makeSignal({ durationMs: 1200, kind: "free", noiseRms: 0.02 })[0];
    analyzer.push(buffer.frame, buffer.samples, buffer.sampleRate);
    analyzer.finish();
    analyzer.result();
    const after = estimateF0(pureSine(120), SAMPLE_RATE);
    assert.equal(after, before);
  });
});
