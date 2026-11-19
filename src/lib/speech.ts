/**
 * انواع و برچسب‌های مشترک ماژول ارزیابی گفتار و زبان.
 * این فایل فقط داده‌های نمایشی و نوع‌ها را نگه می‌دارد و به دیتابیس وابسته نیست.
 */

export const SPEECH_STATUSES = ["COMING_SOON", "IN_DEVELOPMENT", "AVAILABLE", "DISABLED"] as const;
export type SpeechStatus = (typeof SPEECH_STATUSES)[number];

export const SPEECH_ASSESSMENT_TYPES = [
  "STANDARDIZED_QUESTIONNAIRE",
  "STANDARDIZED_SCALE",
  "PERFORMANCE_MEASURE",
  "CLINICAL_ASSESSMENT",
  "CLINICAL_TASK",
  "SCREENING_TOOL",
] as const;
export type SpeechAssessmentType = (typeof SPEECH_ASSESSMENT_TYPES)[number];

/** نمای یک آزمون برای رابط کاربری؛ فیلدهای اجرایی/حساس در آن قرار نمی‌گیرند. */
export type SpeechAssessmentView = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  assessmentType: string;
  method: string;
  status: string;
  published: boolean;
  order: number;
  requiresRightsReview: boolean;
  rightsNote: string | null;
  implementationKey: string | null;
  implementationPath: string | null;
};

/** نمای یک دسته‌بندی همراه با آزمون‌های منتشرشده‌ی آن. */
export type SpeechCategoryView = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  assessments: SpeechAssessmentView[];
};

export const SPEECH_STATUS_META: Record<SpeechStatus, { label: string; badge: string; action: string }> = {
  COMING_SOON: {
    label: "به‌زودی",
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    action: "به‌زودی در دسترس قرار می‌گیرد",
  },
  IN_DEVELOPMENT: {
    label: "در حال توسعه",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    action: "در حال آماده‌سازی",
  },
  AVAILABLE: {
    label: "فعال",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    action: "شروع ارزیابی",
  },
  DISABLED: {
    label: "غیرفعال",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    action: "غیرفعال است",
  },
};

export function speechStatusMeta(status: string) {
  return SPEECH_STATUS_META[status as SpeechStatus] ?? SPEECH_STATUS_META.COMING_SOON;
}

export const SPEECH_TYPE_LABELS: Record<SpeechAssessmentType, string> = {
  STANDARDIZED_QUESTIONNAIRE: "پرسش‌نامه‌ی استاندارد",
  STANDARDIZED_SCALE: "مقیاس استاندارد",
  PERFORMANCE_MEASURE: "سنجه‌ی عملکردی",
  CLINICAL_ASSESSMENT: "ارزیابی بالینی",
  CLINICAL_TASK: "تکلیف بالینی",
  SCREENING_TOOL: "ابزار غربالگری",
};

export function speechTypeLabel(type: string) {
  return SPEECH_TYPE_LABELS[type as SpeechAssessmentType] ?? "ارزیابی";
}

/**
 * فقط آزمون‌هایی که هم فعال شده‌اند و هم مسیر اجرای واقعی دارند قابل شروع هستند.
 * تا زمانی که وضعیت AVAILABLE نشود و مسیر پیاده‌سازی ثبت نشود، هیچ لینکی ساخته نمی‌شود.
 */
export function isSpeechAssessmentAvailable(
  assessment: Pick<SpeechAssessmentView, "status" | "implementationPath">,
) {
  return assessment.status === "AVAILABLE" && Boolean(assessment.implementationPath);
}
