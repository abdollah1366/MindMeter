/**
 * توابع خالص GRBAS: اعتبارسنجی امتیاز، کامل‌بودن و نمایش خلاصه.
 *
 * هیچ تابعی نمره‌ی G را از R/B/A/S نمی‌سازد و هیچ جمع/میانگین/نمره‌ی کلی
 * تولید نمی‌شود. پنج مؤلفه مستقل باقی می‌مانند.
 */
import {
  GRBAS_COMPONENT_KEYS,
  GRBAS_MAX_SCORE,
  GRBAS_MIN_SCORE,
  type GrbasComponentKey,
  type GrbasScores,
} from "./grbas-types";

export function isGrbasScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= GRBAS_MIN_SCORE &&
    value <= GRBAS_MAX_SCORE
  );
}

/** آیا هر پنج مؤلفه امتیاز معتبر ۰ تا ۳ دارند؟ */
export function isGrbasScoresComplete(
  value: Partial<GrbasScores> | null | undefined,
): value is GrbasScores {
  if (!value) return false;
  return GRBAS_COMPONENT_KEYS.every((key) => isGrbasScore(value[key]));
}

/**
 * خلاصه‌ی نمایشی به شکل «G1 R2 B0 A0 S1».
 * این رشته فقط برای نمایش است و نمره یا شدت کلی محسوب نمی‌شود.
 */
export function formatGrbasSummary(scores: GrbasScores): string {
  return GRBAS_COMPONENT_KEYS.map((key) => `${key}${scores[key]}`).join(" ");
}

/** برچسب فارسی سطح برای یک مؤلفه؛ فقط برای نمایش رابط کاربری. */
export function grbasLevelLabel(
  component: { levels: readonly [string, string, string, string] },
  score: number,
): string | null {
  return isGrbasScore(score) ? component.levels[score] : null;
}

/**
 * قانون خالص دسترسی به نتیجه: صاحب پرونده همیشه مجاز است؛ ارزیاب دیگر فقط
 * وقتی مجاز است که مجوز فعال دسترسی به پرونده‌ی همان مراجع را داشته باشد.
 */
export function canViewGrbasResult(
  viewerId: string | null | undefined,
  ownerId: string,
  hasActiveGrant: boolean,
): boolean {
  if (!viewerId) return false;
  if (viewerId === ownerId) return true;
  return hasActiveGrant;
}

/** فقط متخصص دارای پروفایل تأییدشده مجاز به ثبت ارزیابی است. */
export function isApprovedGrbasEvaluator(
  profile: { status: string } | null | undefined,
): boolean {
  return profile?.status === "APPROVED";
}

/** ترتیب ثابت مؤلفه‌ها برای پیمایش پایدار در رابط کاربری و تست‌ها. */
export const GRBAS_COMPONENT_ORDER: readonly GrbasComponentKey[] = GRBAS_COMPONENT_KEYS;
