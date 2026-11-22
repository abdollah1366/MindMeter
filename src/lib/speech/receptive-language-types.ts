export const RECEPTIVE_LANGUAGE_DOMAINS = [
  {
    id: "R1",
    domain: "word_comprehension",
    label: "درک واژه",
    description: "تطبیق واژه‌ی شنیده‌شده با تصویر، شیء یا مفهوم",
  },
  {
    id: "R2",
    domain: "sentence_comprehension",
    label: "درک جمله",
    description: "فهم معنای جمله‌های ساده و مطابقت با موقعیت",
  },
  {
    id: "R3",
    domain: "grammatical_comprehension",
    label: "درک صرف و نحو",
    description: "تمایز ساختارهای دستوری مانند فاعل، مفعول و زمان",
  },
  {
    id: "R4",
    domain: "command_following",
    label: "پیروی از دستور",
    description: "اجرای دستورهای یک‌مرحله‌ای و چندمرحله‌ای",
  },
  {
    id: "R5",
    domain: "question_comprehension",
    label: "درک پرسش",
    description: "پاسخ به پرسش‌های بله/خیر و پرسش‌های پرسشی",
  },
  {
    id: "R6",
    domain: "connected_speech",
    label: "درک گفتار پیوسته",
    description: "فهم متن یا روایت شنیداری کوتاه",
  },
  {
    id: "R7",
    domain: "contextual_comprehension",
    label: "درک در بافت",
    description: "فهم پیام با استفاده از بافت و سرنخ‌های موقعیتی",
  },
  {
    id: "R8",
    domain: "functional_comprehension",
    label: "کفایت درک ارتباطی",
    description: "توانایی فهم و پاسخ در تعامل روزمره",
  },
] as const;

export const RECEPTIVE_LANGUAGE_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export const RECEPTIVE_LANGUAGE_SEVERITY_LABELS = [
  "طبیعی",
  "خفیف",
  "متوسط",
  "شدید",
  "بسیار شدید",
] as const;

export const RECEPTIVE_LANGUAGE_TASKS = [
  {
    title: "درک واژه",
    prompt: "تطبیق واژه‌ی شنیده‌شده با تصویر یا شیء آشنا.",
  },
  {
    title: "پیروی از دستور",
    prompt: "دستورهای یک‌مرحله‌ای و چندمرحله‌ای با طول فزاینده.",
  },
  {
    title: "درک جمله",
    prompt: "مطابقت جمله‌ی شنیده‌شده با تصویر یا موقعیت.",
  },
  {
    title: "درک صرف و نحو",
    prompt: "تمایز جمله‌های دارای ساختار دستوری مشابه، مانند فاعل و مفعول.",
  },
  {
    title: "پاسخ به پرسش",
    prompt: "پرسش‌های بله/خیر و پرسش‌های پرسشی درباره‌ی متن شنیده‌شده.",
  },
  {
    title: "درک گفتار پیوسته",
    prompt: "شنیدن یک متن کوتاه و پاسخ به پرسش‌های مربوط به آن.",
  },
] as const;

export type ReceptiveLanguageStoredResult = {
  key: "receptive-language";
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
