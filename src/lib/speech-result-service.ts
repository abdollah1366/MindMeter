import "server-only";
import { db } from "@/lib/db";
import { canAccessSpeechResult } from "@/lib/speech-result-access";
import { parseMptPayload } from "@/lib/speech/mpt-payload";
import type { MptStoredResult } from "@/lib/speech/mpt-types";

export type SpeechResultView = {
  id: string;
  assessmentSlug: string;
  createdAt: Date;
  result: MptStoredResult;
};

function decode(data: string): MptStoredResult | null {
  try {
    return parseMptPayload(JSON.parse(data));
  } catch {
    return null;
  }
}

/**
 * خواندن نتیجه فقط با شناسه کاربر لاگینشده. فیلتر userId در خود کوئری اعمال
 * میشود تا حتی در صورت حذف بررسی صریح، هیچ نتیجهای از کاربر دیگری برگردد.
 */
export async function getSpeechResultForUser(id: string, userId: string): Promise<SpeechResultView | null> {
  const row = await db.speechResult.findFirst({ where: { id, userId } });
  if (!row || !canAccessSpeechResult(userId, row.userId)) return null;
  const result = decode(row.data);
  if (!result) return null;
  return { id: row.id, assessmentSlug: row.assessmentSlug, createdAt: row.createdAt, result };
}

export async function listSpeechResultsForUser(
  userId: string,
  assessmentSlug?: string,
): Promise<SpeechResultView[]> {
  const rows = await db.speechResult.findMany({
    where: { userId, ...(assessmentSlug ? { assessmentSlug } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return rows.flatMap((row) => {
    const result = decode(row.data);
    if (!result || !canAccessSpeechResult(userId, row.userId)) return [];
    return [{ id: row.id, assessmentSlug: row.assessmentSlug, createdAt: row.createdAt, result }];
  });
}
