export const EXPRESSIVE_LANGUAGE_DOMAINS = [
  {
    id: "E1",
    domain: "spontaneous_speech",
    label: "گفتار خودانگیخته",
    description: "روانی و کفایت گفتار پیوسته در موقعیت طبیعی",
  },
  {
    id: "E2",
    domain: "confrontation_naming",
    label: "نامیدن",
    description: "نامیدن اشیاء، تصاویر و مفاهیم",
  },
  {
    id: "E3",
    domain: "word_retrieval",
    label: "بازیابی واژه",
    description: "دسترسی سریع به واژه در گفتار",
  },
  {
    id: "E4",
    domain: "repetition",
    label: "تکرار",
    description: "تکرار واژه‌ها و جمله‌های شنیده‌شده",
  },
  {
    id: "E5",
    domain: "sentence_formulation",
    label: "ساخت جمله",
    description: "تشکیل جمله‌های کامل و متناسب با تکلیف",
  },
  {
    id: "E6",
    domain: "morphosyntax",
    label: "صرف و نحو",
    description: "صحت دستوری، صرف فعل و نحو",
  },
  {
    id: "E7",
    domain: "discourse",
    label: "گفتار پیوسته و روایت",
    description: "سازمان‌دهی و انسجام در توصیف و روایت",
  },
  {
    id: "E8",
    domain: "functional_communication",
    label: "کفایت ارتباطی",
    description: "توانایی انتقال پیام و تعامل کلامی",
  },
] as const;

export const EXPRESSIVE_LANGUAGE_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export const EXPRESSIVE_LANGUAGE_SEVERITY_LABELS = [
  "طبیعی",
  "خفیف",
  "متوسط",
  "شدید",
  "بسیار شدید",
] as const;

export const EXPRESSIVE_LANGUAGE_TASKS = [
  {
    title: "گفتار خودانگیخته",
    prompt: "از مراجع بخواهید روز خود یا یک موضوع آشنا را توصیف کند.",
  },
  {
    title: "نامیدن",
    prompt: "نامیدن تصاویر یا اشیاء آشنا و سپس مفاهیم کمتر آشنا.",
  },
  {
    title: "تکرار",
    prompt: "تکرار واژه‌ها و جمله‌های با طول فزاینده.",
  },
  {
    title: "ساخت جمله",
    prompt: "ساخت جمله با واژه‌های داده‌شده و توصیف یک صحنه.",
  },
  {
    title: "روایت",
    prompt: "بازگویی یک داستان کوتاه یا توصیف ترتیب رخدادها.",
  },
] as const;

export type ExpressiveLanguageStoredResult = {
  key: "expressive-language";
  version: 1;
  ratings: { id: string; domain: string; label: string; score: number }[];
  overallSeverity: number;
  notes: string | null;
  evaluator: {
    clinicianProfileId: string;
    clinicianUserId: string;
    kind: "PSYCHOLOGIST" | "PHYSICIAN";
  };
  assessedAt: string;
};
