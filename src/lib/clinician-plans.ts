import "server-only";

/** انواع بستههای اعتبار تست پزشکان */
export type ClinicianPlanKind = "SINGLE" | "PACK_50" | "UNLIMITED_YEAR";

export type ClinicianPlanDef = {
  kind: ClinicianPlanKind;
  title: string;
  subtitle: string;
  /** مبلغ به تومان */
  amount: number;
  /** تعداد تستهای مجاز؛ null یعنی نامحدود */
  totalTests: number | null;
  /** مدت اعتبار به روز؛ null یعنی بدون انقضا */
  durationDays: number | null;
  perks: string[];
  featured?: boolean;
};

/** قیمت بستهها به تومان. تمام پرداختها از همین ثابت خوانده میشوند، نه از ورودی فرم. */
export const CLINICIAN_PLANS: Record<ClinicianPlanKind, ClinicianPlanDef> = {
  SINGLE: {
    kind: "SINGLE",
    title: "اجرای تک تست",
    subtitle: "برای یک بار اجرای هر تست",
    amount: 80_000,
    totalTests: 1,
    durationDays: null,
    perks: ["اجرای یک تست برای هر مراجع", "گزارش قابل چاپ", "امکان درج تفسیر متخصص"],
  },
  PACK_50: {
    kind: "PACK_50",
    title: "بسته ۵۰ تست",
    subtitle: "مناسب مطبهای پرمراجع",
    amount: 3_000_000,
    totalTests: 50,
    durationDays: null,
    perks: ["۵۰ بار اجرای تست", "بدون انقضای زمانی", "گزارش قابل چاپ و تفسیر متخصص"],
    featured: true,
  },
  UNLIMITED_YEAR: {
    kind: "UNLIMITED_YEAR",
    title: "اشتراک نامحدود یکساله",
    subtitle: "آزادی کامل در اجرای تست",
    amount: 5_000_000,
    totalTests: null,
    durationDays: 365,
    perks: ["تست نامحدود به مدت یک سال", "همهی تستهای فعال سایت", "گزارش قابل چاپ و تفسیر متخصص"],
  },
};

export const CLINICIAN_PLAN_LIST: ClinicianPlanDef[] = [
  CLINICIAN_PLANS.SINGLE,
  CLINICIAN_PLANS.PACK_50,
  CLINICIAN_PLANS.UNLIMITED_YEAR,
];

export function clinicianPlan(kind: string): ClinicianPlanDef | undefined {
  return CLINICIAN_PLANS[kind as ClinicianPlanKind];
}

export function planTitle(kind: string) {
  return clinicianPlan(kind)?.title ?? "بسته‌ی تست";
}

export function planCountsLabel(plan: { kind: string }) {
  const def = clinicianPlan(plan.kind);
  if (!def) return "-";
  return def.totalTests === null ? "نامحدود" : `${def.totalTests.toLocaleString("fa-IR")} تست`;
}

export function planStatusLabel(status: string) {
  return (
    {
      PENDING_PAYMENT: "در انتظار پرداخت",
      ACTIVE: "فعال",
      EXHAUSTED: "پایان اعتبار",
      EXPIRED: "منقضی شده",
    }[status] ?? status
  );
}

export function planStatusStyle(status: string) {
  return (
    {
      PENDING_PAYMENT: "bg-amber-50 text-amber-700",
      ACTIVE: "bg-emerald-50 text-emerald-700",
      EXHAUSTED: "bg-slate-100 text-slate-600",
      EXPIRED: "bg-rose-50 text-rose-700",
    }[status] ?? "bg-slate-100 text-slate-600"
  );
}

type PlanRow = {
  kind: string;
  totalTests: number | null;
  usedTests: number;
  expiresAt: Date | null;
  status: string;
};

/** آیا این بسته در حال حاضر قابل مصرف است؟ */
export function planUsable(plan: PlanRow, now = new Date()) {
  if (plan.status !== "ACTIVE") return false;
  if (plan.expiresAt && plan.expiresAt.getTime() <= now.getTime()) return false;
  return plan.totalTests === null || plan.usedTests < plan.totalTests;
}

/** تعداد تستهای باقیمانده؛ null یعنی نامحدود */
export function planRemaining(plan: PlanRow) {
  if (plan.totalTests === null) return null;
  return Math.max(0, plan.totalTests - plan.usedTests);
}

/**
 * ترتیب مصرف اعتبار: بستههای دارای انقضا زودتر مصرف میشوند، سپس بستههای حجیم و در نهایت تکی.
 * این ترتیب به سود متخصص است چون اعتبار زودانقضا هدر نمیرود.
 */
export function sortPlansForUse<T extends PlanRow>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    if (a.expiresAt && b.expiresAt) return a.expiresAt.getTime() - b.expiresAt.getTime();
    if (a.expiresAt) return -1;
    if (b.expiresAt) return 1;
    return (b.totalTests ?? Number.MAX_SAFE_INTEGER) - (a.totalTests ?? Number.MAX_SAFE_INTEGER);
  });
}
