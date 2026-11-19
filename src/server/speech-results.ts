"use server";

import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { parseMptPayload } from "@/lib/speech/mpt-payload";

export type SaveMptResultResponse =
  | { ok: true; id: string }
  | { ok: false; reason: "auth" | "invalid" };

const DEDUPE_WINDOW_MS = 15_000;

/** ذخیره نتیجه MPT. شناسه کاربر فقط از session سرور گرفته میشود. */
export async function saveMptResult(input: unknown): Promise<SaveMptResultResponse> {
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
