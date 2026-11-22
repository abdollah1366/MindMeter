import "server-only";
import { db } from "@/lib/db";
import { canAccessSpeechResult } from "@/lib/speech-result-access";
import { parseMptPayload } from "@/lib/speech/mpt-payload";
import type { MptStoredResult } from "@/lib/speech/mpt-types";
import { parseSustainedVowelPayload } from "@/lib/speech/sustained-vowel-payload";
import type { SustainedVowelStoredResult } from "@/lib/speech/sustained-vowel-types";
import { parseVoiceQualityPayload } from "@/lib/speech/voice-quality-payload";
import type { VoiceQualityStoredResult } from "@/lib/speech/voice-quality-types";
import { parseVhi30Payload } from "@/lib/speech/vhi-30-payload";
import type { Vhi30StoredResult } from "@/lib/speech/vhi-30-payload";
import { parseAmrPayload } from "@/lib/speech/amr-payload";
import type { AmrStoredResult } from "@/lib/speech/amr-types";
import { parseSmrPayload } from "@/lib/speech/smr-payload";
import type { SmrStoredResult } from "@/lib/speech/smr-types";
import { parseEat10Payload } from "@/lib/speech/eat-10-payload";
import type { Eat10StoredResult } from "@/lib/speech/eat-10-types";
import { parseArticulationStored } from "@/lib/speech/articulation-payload";
import type { ArticulationStoredResult } from "@/lib/speech/articulation-types";
import { parseFoisStored } from "@/lib/speech/fois-payload";
import type { FoisStoredResult } from "@/lib/speech/fois-types";
import { parseVerbalFluencyPayload } from "@/lib/speech/verbal-fluency-payload";
import type { VerbalFluencyStoredResult } from "@/lib/speech/verbal-fluency-types";
import { parseSpeechIntelligibilityStored } from "@/lib/speech/speech-intelligibility-payload";
import type { SpeechIntelligibilityStoredResult } from "@/lib/speech/speech-intelligibility-types";
import { parseSsi4Stored } from "@/lib/speech/ssi-4-payload";
import type { Ssi4StoredResult } from "@/lib/speech/ssi-4-types";
import { parseDysarthriaStored } from "@/lib/speech/dysarthria-payload";
import type { DysarthriaStoredResult } from "@/lib/speech/dysarthria-types";
import { parseAosStored } from "@/lib/speech/apraxia-of-speech-payload";
import type { AosStoredResult } from "@/lib/speech/apraxia-of-speech-types";
import { parsePictureNamingStored } from "@/lib/speech/picture-naming-payload";
import type { PictureNamingStoredResult } from "@/lib/speech/picture-naming-types";
import { parseParkinsonStored } from "@/lib/speech/parkinsons-speech-payload";
import type { ParkinsonStoredResult } from "@/lib/speech/parkinsons-speech-types";
import { parseClinicalSwallowingStored } from "@/lib/speech/clinical-swallowing-payload";
import type { ClinicalSwallowingStoredResult } from "@/lib/speech/clinical-swallowing-types";
import { parseExpressiveLanguageStored } from "@/lib/speech/expressive-language-payload";
import type { ExpressiveLanguageStoredResult } from "@/lib/speech/expressive-language-types";
import { parseGrbasStored } from "@/lib/speech/grbas-payload";
import type { GrbasStoredResult } from "@/lib/speech/grbas-payload";

type BaseView = {
  id: string;
  assessmentSlug: string;
  createdAt: Date;
};

/**
 * نتیجه ذخیرهشده میتواند متعلق به MPT، تحلیل واکه پایدار، ارزیابی کیفیت صوت
 * یا پرسشنامه VHI-30 باشد. discriminate بر اساس assessmentSlug صورت میگیرد که
 * فقط توسط سرور هنگام درج تنظیم شده است؛ سپس payload با اعتبارسنج مربوط به همان
 * نوع بررسی میشود. نتایج پرسشنامه جدا از نتایج اندازهگیری آکوستیکی نگه داشته میشوند.
 */
export type SpeechResultView =
  | (BaseView & { kind: "mpt"; result: MptStoredResult })
  | (BaseView & { kind: "sustained-vowel"; result: SustainedVowelStoredResult })
  | (BaseView & { kind: "voice-quality"; result: VoiceQualityStoredResult })
  | (BaseView & { kind: "vhi-30"; result: Vhi30StoredResult })
  | (BaseView & { kind: "grbas"; result: GrbasStoredResult })
  | (BaseView & { kind: "amr"; result: AmrStoredResult })
  | (BaseView & { kind: "smr"; result: SmrStoredResult })
  | (BaseView & { kind: "articulation"; result: ArticulationStoredResult })
  | (BaseView & { kind: "eat-10"; result: Eat10StoredResult })
  | (BaseView & { kind: "fois"; result: FoisStoredResult })
  | (BaseView & { kind: "verbal-fluency"; result: VerbalFluencyStoredResult })
  | (BaseView & { kind: "speech-intelligibility"; result: SpeechIntelligibilityStoredResult })
  | (BaseView & { kind: "ssi-4"; result: Ssi4StoredResult })
  | (BaseView & { kind: "dysarthria"; result: DysarthriaStoredResult })
  | (BaseView & { kind: "apraxia-of-speech"; result: AosStoredResult })
  | (BaseView & { kind: "picture-naming"; result: PictureNamingStoredResult })
  | (BaseView & { kind: "parkinsons-speech"; result: ParkinsonStoredResult })
  | (BaseView & { kind: "clinical-swallowing"; result: ClinicalSwallowingStoredResult })
  | (BaseView & { kind: "expressive-language"; result: ExpressiveLanguageStoredResult });

type ResultRow = { id: string; assessmentSlug: string; createdAt: Date; userId: string; data: string };

function decodeRow(row: ResultRow, userId: string): SpeechResultView | null {
  // فیلتر مالکیت قبل از هرگونه پارس کردن: نتیجه کاربر دیگری حتی خوانده هم نمیشود.
  if (!canAccessSpeechResult(userId, row.userId)) return null;
  const base: BaseView = { id: row.id, assessmentSlug: row.assessmentSlug, createdAt: row.createdAt };
  try {
    const parsed: unknown = JSON.parse(row.data);
    if (row.assessmentSlug === "voice-quality-assessment") {
      const result = parseVoiceQualityPayload(parsed);
      return result ? { ...base, kind: "voice-quality", result } : null;
    }
    if (row.assessmentSlug === "sustained-vowel-analysis") {
      const result = parseSustainedVowelPayload(parsed);
      return result ? { ...base, kind: "sustained-vowel", result } : null;
    }
    if (row.assessmentSlug === "vhi-30") {
      const result = parseVhi30Payload(parsed);
      return result ? { ...base, kind: "vhi-30", result } : null;
    }
    if (row.assessmentSlug === "grbas") {
      const result = parseGrbasStored(parsed);
      return result ? { ...base, kind: "grbas", result } : null;
    }
    if (row.assessmentSlug === "amr") {
      const result = parseAmrPayload(parsed);
      return result ? { ...base, kind: "amr", result } : null;
    }
    if (row.assessmentSlug === "smr") {
      const result = parseSmrPayload(parsed);
      return result ? { ...base, kind: "smr", result } : null;
    }
    if (row.assessmentSlug === "articulation") {
      const result = parseArticulationStored(parsed);
      return result ? { ...base, kind: "articulation", result } : null;
    }
    if (row.assessmentSlug === "eat-10") {
      const result = parseEat10Payload(parsed);
      return result ? { ...base, kind: "eat-10", result } : null;
    }
    if (row.assessmentSlug === "fois") {
      const result = parseFoisStored(parsed);
      return result ? { ...base, kind: "fois", result } : null;
    }
    if (row.assessmentSlug === "verbal-fluency") {
      const result = parseVerbalFluencyPayload(parsed);
      return result ? { ...base, kind: "verbal-fluency", result } : null;
    }
    if (row.assessmentSlug === "speech-intelligibility") {
      const result = parseSpeechIntelligibilityStored(parsed);
      return result ? { ...base, kind: "speech-intelligibility", result } : null;
    }
    if (row.assessmentSlug === "ssi-4") {
      const result = parseSsi4Stored(parsed);
      return result ? { ...base, kind: "ssi-4", result } : null;
    }
    if (row.assessmentSlug === "dysarthria") {
      const result = parseDysarthriaStored(parsed);
      return result ? { ...base, kind: "dysarthria", result } : null;
    }
    if (row.assessmentSlug === "apraxia-of-speech") {
      const result = parseAosStored(parsed);
      return result ? { ...base, kind: "apraxia-of-speech", result } : null;
    }
    if (row.assessmentSlug === "picture-naming") {
      const result = parsePictureNamingStored(parsed);
      return result ? { ...base, kind: "picture-naming", result } : null;
    }
    if (row.assessmentSlug === "parkinsons-speech") {
      const result = parseParkinsonStored(parsed);
      return result ? { ...base, kind: "parkinsons-speech", result } : null;
    }
    if (row.assessmentSlug === "clinical-swallowing") {
      const result = parseClinicalSwallowingStored(parsed);
      return result ? { ...base, kind: "clinical-swallowing", result } : null;
    }
    if (row.assessmentSlug === "expressive-language") {
      const result = parseExpressiveLanguageStored(parsed);
      return result ? { ...base, kind: "expressive-language", result } : null;
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
