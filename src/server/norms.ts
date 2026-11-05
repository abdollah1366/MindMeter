"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { buildNormReport, type NormReport } from "@/lib/norms";

/** مقایسه‌ی نتیجه با هنجارها؛ فقط برای صاحب نتیجه، متخصص دارای دسترسی یا ادمین */
export async function getNormReport(resultId: string): Promise<NormReport | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const result = await db.testResult.findUnique({ where: { id: resultId }, select: { userId: true } });
  if (!result) return null;
  if (result.userId !== user.id && user.role !== "ADMIN") {
    const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
    if (!profile || profile.status !== "APPROVED" || !(await hasAccess(profile.id, result.userId))) return null;
  }
  return buildNormReport(resultId);
}
