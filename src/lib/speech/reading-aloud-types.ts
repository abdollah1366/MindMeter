export const READING_ALOUD_PASSAGES = [
  {
    id: "P1",
    title: "کتاب و قلم",
    wordCount: 54,
    lines: [
      "امروز صبح علی از خواب بیدار شد و به آشپزخانه رفت.",
      "او یک فنجان چای داغ را کنار پنجره گذاشت.",
      "باد ملایمی از بیرون آمد و برگها را تکان داد.",
      "علی کتابی را از قفسه برداشت و شروع به خواندن کرد.",
      "هر صفحه او را به یاد سفری انداخت که سال پیش رفته بود.",
    ],
  },
  {
    id: "P2",
    title: "بازار",
    wordCount: 42,
    lines: [
      "شنبه صبح مادر و دختر به بازار رفتند.",
      "آنها از کنار دکانهای کوچک گذشتند.",
      "دختر چند سیب سرخ و یک دسته گل خرید.",
      "مادر برای ناهار ماهی و برنج انتخاب کرد.",
      "در راه برگشت، اتوبوسی را دیدند که در ایستگاه منتظر بود.",
    ],
  },
  {
    id: "P3",
    title: "پارک",
    wordCount: 36,
    lines: [
      "عصر جمعه خانوادهای به پارک رفتند.",
      "بچهها روی چمن دویدند و توپ بازی کردند.",
      "پدر روی نیمکت نشست و روزنامه خواند.",
      "مادر از درختان و گلهای تازه عکس گرفت.",
      "قبل از غروب، همگی به خانه برگشتند.",
    ],
  },
] as const;

export const READING_ALOUD_DOMAINS = [
  {
    id: "Q1",
    domain: "accuracy",
    label: "دقت خواندن",
    description: "تطابق واژههای خواندهشده با متن",
  },
  {
    id: "Q2",
    domain: "fluency",
    label: "روانی خواندن",
    description: "پیوستگی، سرعت مناسب و مکثهای درست",
  },
  {
    id: "Q3",
    domain: "prosody",
    label: "آهنگ و تکیه",
    description: "ریتم، تکیه و لحن در خواندن",
  },
] as const;

export const READING_ALOUD_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export const READING_ALOUD_SEVERITY_LABELS = [
  "طبیعی",
  "خفیف",
  "متوسط",
  "شدید",
  "بسیار شدید",
] as const;

export type ReadingAloudPerformance = {
  durationSeconds: number;
  wordsRead: number;
  misreadWords: number;
  omissions: number;
  additions: number;
  selfCorrections: number;
};

export type ReadingAloudSummary = {
  errorCount: number;
  wordsCorrect: number;
  accuracyPercent: number;
  wordsCorrectPerMinute: number;
};

export type ReadingAloudStoredResult = {
  key: "reading-aloud";
  version: 1;
  passage: { id: string; title: string; wordCount: number };
  performance: ReadingAloudPerformance;
  ratings: { id: string; domain: string; label: string; score: number }[];
  overallSeverity: number;
  summary: ReadingAloudSummary;
  notes: string | null;
  evaluator: {
    clinicianProfileId: string;
    clinicianUserId: string;
    kind: "PSYCHOLOGIST" | "PHYSICIAN";
  };
  assessedAt: string;
};
