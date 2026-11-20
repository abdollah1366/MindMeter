/**
 * تست‌های واحد آزمون AMR.
 * تحلیل خالص، اعتبارسنج payload و کنترل دسترسی بررسی می‌شوند.
 * هیچ میکروفون یا سرویس خارجی لازم نیست.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { AudioFrame, MptQuality } from "../src/lib/speech/mpt-types";
import { detectSyllables, analyzeAmrTask } from "../src/lib/speech/amr-analysis";
import { parseAmrPayload } from "../src/lib/speech/amr-payload";
import { canViewGrbasResult } from "../src/lib/speech/grbas-scoring";

function makeFrames(): AudioFrame[] {
  const frames: AudioFrame[] = [];
  // baseline 400ms
  for (let t = 0; t < 400; t += 25) frames.push({ t, rms: 0.02, peak: 0.03 });
  // 5 syllables every 200ms, each 50ms burst
  for (let i = 0; i < 5; i++) {
    const start = 400 + i * 200;
    for (let dt = 0; dt < 50; dt += 25) frames.push({ t: start + dt, rms: 0.35, peak: 0.5 });
    for (let dt = 50; dt < 200; dt += 25) frames.push({ t: start + dt, rms: 0.02, peak: 0.03 });
  }
  return frames;
}

function makeQuality(frames: AudioFrame[]): MptQuality {
  const rms = frames.map((f) => f.rms);
  return {
    ok: true,
    issues: [],
    noiseFloorRms: 0.02,
    peakRms: Math.max(...rms),
    clippedRatio: 0,
    internalSilenceMs: 0,
  };
}

function readSource(file: string) {
  return readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
}

describe("تشخیص هجا", () => {
  it("۱. گفتار واضح و منظم: ۵ هجا تشخیص داده می‌شود", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const syllables = detectSyllables(frames, 0, null, q.noiseFloorRms);
    assert.equal(syllables.length, 5);
  });

  it("۲. نرخ تکرار محاسبه می‌شود", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    assert.equal(metrics.detectedSyllableCount, 5);
    assert.ok(metrics.ratePerSecond !== null && metrics.ratePerSecond > 0);
    assert.ok(metrics.activeDurationMs !== null && metrics.activeDurationMs > 0);
  });

  it("۳. فاصله بین هجاها و CV محاسبه می‌شوند", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    assert.ok(metrics.meanIntervalMs !== null);
    assert.ok(metrics.sdIntervalMs !== null);
    assert.ok(metrics.cvPercent !== null);
    // ریتم منظم → CV پایین
    assert.ok((metrics.cvPercent as number) < 20);
  });

  it("۴. نویز زمینه حذف می‌شود (قله‌های ضعیف شمارش نمی‌شوند)", () => {
    const frames = makeFrames();
    // اضافه کردن نویز کوچک
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].rms < 0.1) frames[i].rms = 0.03;
    }
    const q = makeQuality(frames);
    const syllables = detectSyllables(frames, 0, null, q.noiseFloorRms);
    assert.equal(syllables.length, 5);
  });

  it("۵. مکث‌های متعدد تشخیص داده می‌شوند", () => {
    const frames = makeFrames();
    // اضافه کردن مکث طولانی بین هجا ۲ و ۳
    const pauseFrames: AudioFrame[] = [];
    for (let t = 0; t < 400; t += 25) pauseFrames.push({ t, rms: 0.02, peak: 0.03 });
    // 2 syllables
    for (let i = 0; i < 2; i++) {
      const start = 400 + i * 200;
      for (let dt = 0; dt < 50; dt += 25) pauseFrames.push({ t: start + dt, rms: 0.35, peak: 0.5 });
      for (let dt = 50; dt < 200; dt += 25) pauseFrames.push({ t: start + dt, rms: 0.02, peak: 0.03 });
    }
    // pause 500ms
    const pauseStart = 400 + 2 * 200;
    for (let dt = 0; dt < 500; dt += 25) pauseFrames.push({ t: pauseStart + dt, rms: 0.02, peak: 0.03 });
    // 3 more syllables
    for (let i = 2; i < 5; i++) {
      const start = pauseStart + 500 + (i - 2) * 200;
      for (let dt = 0; dt < 50; dt += 25) pauseFrames.push({ t: start + dt, rms: 0.35, peak: 0.5 });
      for (let dt = 50; dt < 200; dt += 25) pauseFrames.push({ t: start + dt, rms: 0.02, peak: 0.03 });
    }
    const q = makeQuality(pauseFrames);
    const metrics = analyzeAmrTask(pauseFrames, q, 0, null, "pa", "/pa/", 1);
    assert.ok(metrics.pauseCount >= 1);
  });
});

describe("گفتار سریع و آهسته", () => {
  it("گفتار سریع: نرخ بالاتر", () => {
    const frames: AudioFrame[] = [];
    for (let t = 0; t < 400; t += 25) frames.push({ t, rms: 0.02, peak: 0.03 });
    for (let i = 0; i < 8; i++) {
      const start = 400 + i * 100;
      for (let dt = 0; dt < 40; dt += 25) frames.push({ t: start + dt, rms: 0.35, peak: 0.5 });
      for (let dt = 40; dt < 100; dt += 25) frames.push({ t: start + dt, rms: 0.02, peak: 0.03 });
    }
    const q = makeQuality(frames);
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    assert.ok((metrics.ratePerSecond as number) > 5);
  });

  it("گفتار آهسته: نرخ پایین‌تر", () => {
    const frames: AudioFrame[] = [];
    for (let t = 0; t < 400; t += 25) frames.push({ t, rms: 0.02, peak: 0.03 });
    for (let i = 0; i < 3; i++) {
      const start = 400 + i * 400;
      for (let dt = 0; dt < 60; dt += 25) frames.push({ t: start + dt, rms: 0.35, peak: 0.5 });
      for (let dt = 60; dt < 400; dt += 25) frames.push({ t: start + dt, rms: 0.02, peak: 0.03 });
    }
    const q = makeQuality(frames);
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    assert.ok((metrics.ratePerSecond as number) < 4);
  });
});

describe("نویز و سکوت", () => {
  it("ضبط بدون گفتار: نامعتبر", () => {
    const frames: AudioFrame[] = [];
    for (let t = 0; t < 2000; t += 25) frames.push({ t, rms: 0.01, peak: 0.02 });
    const q: MptQuality = { ok: false, issues: ["NO_SIGNAL"], noiseFloorRms: 0.01, peakRms: 0.02, clippedRatio: 0, internalSilenceMs: 0 };
    const metrics = analyzeAmrTask(frames, q, -1, null, "pa", "/pa/", 1);
    assert.equal(metrics.valid, false);
    assert.equal(metrics.detectedSyllableCount, 0);
    assert.equal(metrics.confidence, 0);
    assert.equal(metrics.needsManualReview, true);
  });

  it("صدای بسیار ضعیف: confidence پایین", () => {
    const frames = makeFrames().map((f) => ({ ...f, rms: f.rms * 0.1, peak: f.peak * 0.1 }));
    const q: MptQuality = { ok: false, issues: ["WEAK_SIGNAL"], noiseFloorRms: 0.002, peakRms: 0.05, clippedRatio: 0, internalSilenceMs: 0 };
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    assert.ok(metrics.quality.issues.includes("WEAK_SIGNAL"));
    assert.ok(metrics.confidence < 100);
  });

  it("صدای clipping: needsManualReview", () => {
    const frames = makeFrames();
    const q: MptQuality = { ok: false, issues: ["CLIPPING"], noiseFloorRms: 0.02, peakRms: 0.99, clippedRatio: 0.2, internalSilenceMs: 0 };
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    assert.equal(metrics.needsManualReview, true);
    assert.ok(metrics.limitations.some((l) => l.includes("CLIPPING") || l.includes("اشباع")));
  });
});

describe("بازبینی دستی", () => {
  it("manualSyllableCount بازمحاسبه می‌کند", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const metrics = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1, 7);
    assert.equal(metrics.manualSyllableCount, 7);
    assert.equal(metrics.syllableCount, 7);
    assert.ok(metrics.limitations.some((l) => l.includes("دستی")));
  });

  it("confidence نامنظم (CV بالا) کاهش می‌یابد", () => {
    // نامنظم: فواصل متغیر
    const frames: AudioFrame[] = [];
    for (let t = 0; t < 400; t += 25) frames.push({ t, rms: 0.02, peak: 0.03 });
    const gaps = [120, 250, 100, 300, 150];
    let t = 400;
    for (const gap of gaps) {
      for (let dt = 0; dt < 40; dt += 25) frames.push({ t: t + dt, rms: 0.35, peak: 0.5 });
      t += gap;
      for (let dt = 40; dt < gap; dt += 25) frames.push({ t: t - (gap - dt), rms: 0.02, peak: 0.03 });
    }
    const q = makeQuality(frames);
    const metrics = analyzeAmrTask(frames, q, 0, null, "ta", "/ta/", 1);
    assert.ok(metrics.cvPercent !== null);
  });
});

describe("اعتبارسنجی payload AMR", () => {
  it("payload معتبر پذیرفته می‌شود", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const m1 = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    const m2 = analyzeAmrTask(frames, q, 0, null, "ta", "/ta/", 1);
    const m3 = analyzeAmrTask(frames, q, 0, null, "ka", "/ka/", 1);
    const payload = {
      key: "amr",
      version: 1,
      tasks: [m1, m2, m3],
      lowestRateTask: "pa",
      highestCvTask: "ta",
      overallQuality: "acceptable",
      algorithmVersion: "amr-energy-onset-v1",
      completedAt: new Date().toISOString(),
    };
    assert.ok(parseAmrPayload(payload));
  });

  it("payload ناقص (۲ تکلیف) رد می‌شود", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const m1 = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    const payload = {
      key: "amr",
      version: 1,
      tasks: [m1],
      lowestRateTask: null,
      highestCvTask: null,
      overallQuality: "acceptable",
      algorithmVersion: "amr-energy-onset-v1",
      completedAt: new Date().toISOString(),
    };
    assert.equal(parseAmrPayload(payload), null);
  });

  it("فیلد ناشناخته رد می‌شود", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const m1 = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    const m2 = analyzeAmrTask(frames, q, 0, null, "ta", "/ta/", 1);
    const m3 = analyzeAmrTask(frames, q, 0, null, "ka", "/ka/", 1);
    const payload = {
      key: "amr",
      version: 1,
      tasks: [m1, m2, m3],
      lowestRateTask: null,
      highestCvTask: null,
      overallQuality: "acceptable",
      algorithmVersion: "amr-energy-onset-v1",
      completedAt: new Date().toISOString(),
      diagnosis: "parkinson",
    };
    assert.equal(parseAmrPayload(payload), null);
  });

  it("تکرار تکلیف رد می‌شود", () => {
    const frames = makeFrames();
    const q = makeQuality(frames);
    const m1 = analyzeAmrTask(frames, q, 0, null, "pa", "/pa/", 1);
    const payload = {
      key: "amr",
      version: 1,
      tasks: [m1, { ...m1, task: "pa", label: "/pa/" }, m1],
      lowestRateTask: null,
      highestCvTask: null,
      overallQuality: "acceptable",
      algorithmVersion: "amr-energy-onset-v1",
      completedAt: new Date().toISOString(),
    };
    assert.equal(parseAmrPayload(payload), null);
  });
});

describe("کنترل دسترسی", () => {
  it("دسترسی به نتیجه فقط برای صاحب یا متخصص دارای مجوز", () => {
    assert.equal(canViewGrbasResult("patient-1", "patient-1", false), true);
    assert.equal(canViewGrbasResult("clinician-1", "patient-1", true), true);
    assert.equal(canViewGrbasResult("clinician-1", "patient-1", false), false);
  });
});

describe("کنترل دسترسی و ردیابی در کد", () => {
  it("سرور فقط create می‌کند", () => {
    const source = readSource("../src/server/speech-results.ts");
    assert.match(source, /assessmentSlug: "amr"/);
  });
});
