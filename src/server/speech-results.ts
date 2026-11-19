"use server";

import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { parseMptPayload } from "@/lib/speech/mpt-payload";
import { parseSustainedVowelPayload } from "@/lib/speech/sustained-vowel-payload";
import { parseVoiceQualityPayload } from "@/lib/speech/voice-quality-payload";

export type SaveResultResponse =
  | { ok: true; id: string }
  | { ok: false; reason: "auth" | "invalid" };

const DEDUPE_WINDOW_MS = 15_000;

/** ذخیره نتیجه MPT. شناسه کاربر فقط از session سرور گرفته میشود. */
export async function saveMptResult(input: unknown): Promise<SaveResultResponse> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, reason: "auth" };

  const assessment = await db.speechAssessment.findFirst({
    where: { slug: "mpt", published: true, status: "AVAILABLE" },
    select: { id: true },
  });
  if (!assessment) return { ok: false, reason: "invalid" };

  // ورودی مرورگر قابل دستکاری است؛ کاملاً اعتبارسنجی میشود و فقط فیلدهای سفید ذخیره میشوند.
  const payload = parseMptPayload(input);
  if (!payload) return { ok: false, reason: "invalid" };
  const data = JSON.stringify(payload);

  // جلوگیری از ثبت تکراری ناخواسته (مثلاً کلیک دوباره روی دکمه ذخیره).
  const recent = await db.speechResult.findFirst({
    where: {
      userId,
      assessmentSlug: "mpt",
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true },
  });
  if (recent?.data === data) return { ok: true, id: recent.id };

  const row = await db.speechResult.create({
    data: { userId, assessmentSlug: "mpt", data },
  });
  return { ok: true, id: row.id };
}

/**
 * ذخیره نتیجه تحلیل واکه پایدار. همانند MPT، شناسه کاربر فقط از session سرور
 * گرفته میشود و نتیجه با slug متفاوت ذخیره میشود تا قابل تفکیک بماند.
 */
export async function saveSustainedVowelResult(input: unknown): Promise<SaveResultResponse> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, reason: "auth" };

  const assessment = await db.speechAssessment.findFirst({
    where: { slug: "sustained-vowel-analysis", published: true, status: "AVAILABLE" },
    select: { id: true },
  });
  if (!assessment) return { ok: false, reason: "invalid" };

  // ورودی مرورگر قابل دستکاری است؛ خلاصه در اعتبارسنج دوباره محاسبه میشود.
  const payload = parseSustainedVowelPayload(input);
  if (!payload || payload.validCount < 1) return { ok: false, reason: "invalid" };
  const data = JSON.stringify(payload);

  const recent = await db.speechResult.findFirst({
    where: {
      userId,
      assessmentSlug: "sustained-vowel-analysis",
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true },
  });
  if (recent?.data === data) return { ok: true, id: recent.id };

  const row = await db.speechResult.create({
    data: { userId, assessmentSlug: "sustained-vowel-analysis", data },
  });
  return { ok: true, id: row.id };
}

/**
 * ذخیره نتیجه ارزیابی کیفیت صوت. کاربر فقط از session سرور گرفته میشود،
 * ورودی کاملاً اعتبارسنجی و خلاصه آن دوباره محاسبه میشود و هیچ نمونه خامی
 * ذخیره نمیشود.
 */
export async function saveVoiceQualityResult(input: unknown): Promise<SaveResultResponse> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, reason: "auth" };

  const assessment = await db.speechAssessment.findFirst({
    where: { slug: "voice-quality-assessment", published: true, status: "AVAILABLE" },
    select: { id: true },
  });
  if (!assessment) return { ok: false, reason: "invalid" };

  const payload = parseVoiceQualityPayload(input);
  if (!payload || payload.validSampleCount < 1) return { ok: false, reason: "invalid" };
  const data = JSON.stringify(payload);

  const recent = await db.speechResult.findFirst({
    where: {
      userId,
      assessmentSlug: "voice-quality-assessment",
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true },
  });
  if (recent?.data === data) return { ok: true, id: recent.id };

  const row = await db.speechResult.create({
    data: { userId, assessmentSlug: "voice-quality-assessment", data },
  });
  return { ok: true, id: row.id };
}
