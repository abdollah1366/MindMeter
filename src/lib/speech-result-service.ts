import "server-only";
import { db } from "@/lib/db";
import { canAccessSpeechResult } from "@/lib/speech-result-access";
import { parseMptPayload } from "@/lib/speech/mpt-payload";
import type { MptStoredResult } from "@/lib/speech/mpt-types";
import { parseSustainedVowelPayload } from "@/lib/speech/sustained-vowel-payload";
import type { SustainedVowelStoredResult } from "@/lib/speech/sustained-vowel-types";

type BaseView = {
  id: string;
  assessmentSlug: string;
  createdAt: Date;
};

/**
 * نتیجه ذخیرهشده میتواند متعلق به MPT یا تحلیل واکه پایدار باشد. discriminate
 * بر اساس assessmentSlug صورت میگیرد که فقط توسط سرور هنگام درج تنظیم شده است؛
 * سپس payload با اعتبارسنج مربوط به همان نوع بررسی میشود.
 */
export type SpeechResultView =
  | (BaseView & { kind: "mpt"; result: MptStoredResult })
  | (BaseView & { kind: "sustained-vowel"; result: SustainedVowelStoredResult });

type ResultRow = { id: string; assessmentSlug: string; createdAt: Date; userId: string; data: string };

function decodeRow(row: ResultRow, userId: string): SpeechResultView | null {
  // فیلتر مالکیت قبل از هرگونه پارس کردن: نتیجه کاربر دیگری حتی خوانده هم نمیشود.
  if (!canAccessSpeechResult(userId, row.userId)) return null;
  const base: BaseView = { id: row.id, assessmentSlug: row.assessmentSlug, createdAt: row.createdAt };
  try {
    const parsed: unknown = JSON.parse(row.data);
    if (row.assessmentSlug === "sustained-vowel-analysis") {
      const result = parseSustainedVowelPayload(parsed);
      return result ? { ...base, kind: "sustained-vowel", result } : null;
    }
    const result = parseMptPayload(parsed);
    return result ? { ...base, kind: "mpt", result } : null;
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
  if (!row) return null;
  return decodeRow(row, userId);
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
    const view = decodeRow(row, userId);
    return view ? [view] : [];
  });
}
