import type { AnswerOption, Question } from "@/lib/types";

/** پیام ایمنی برای پاسخ‌های پرخطر */
export const CRISIS_MESSAGE =
  "پاسخ شما نشان می‌دهد ممکن است به آسیب زدن به خود فکر کرده باشید. شما تنها نیستید. لطفاً همین حالا با صدای مشاور بهزیستی (۱۴۸۰)، اورژانس اجتماعی (۱۲۳) یا اورژانس (۱۱۵) تماس بگیرید یا به نزدیک‌ترین مرکز درمانی مراجعه کنید.";

/** ساخت سریع سؤال */
export function q(id: number, text: string, scale?: string, reverse = false): Question {
  return { id: `q${id}`, text, ...(scale ? { scale } : {}), ...(reverse ? { reverse } : {}) };
}

/** گزینه‌های PHQ و GAD: دو هفته‌ی گذشته */
export const FREQ_2W: AnswerOption[] = [
  { label: "اصلاً", value: 0 },
  { label: "چند روز", value: 1 },
  { label: "بیش از نیمی از روزها", value: 2 },
  { label: "تقریباً هر روز", value: 3 },
];

/** گزینه‌های DASS */
export const DASS_OPTIONS: AnswerOption[] = [
  { label: "اصلاً در مورد من صدق نمی‌کرد", value: 0 },
  { label: "تا حدی یا گاهی در مورد من صدق می‌کرد", value: 1 },
  { label: "تا حد زیادی یا بخش قابل‌توجهی از اوقات صدق می‌کرد", value: 2 },
  { label: "کاملاً یا بیشتر اوقات در مورد من صدق می‌کرد", value: 3 },
];

/** گزینه‌های پنج‌درجه‌ای IPIP */
export const IPIP_OPTIONS: AnswerOption[] = [
  { label: "کاملاً نادرست", value: 1 },
  { label: "تا حدی نادرست", value: 2 },
  { label: "نه درست، نه نادرست", value: 3 },
  { label: "تا حدی درست", value: 4 },
  { label: "کاملاً درست", value: 5 },
];
