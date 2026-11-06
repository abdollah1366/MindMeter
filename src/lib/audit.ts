import "server-only";
import { db } from "@/lib/db";

/** برچسب فارسی هر نوع رویداد برای صفحه‌های مدیریت و پرونده */
export const AUDIT_LABEL: Record<string, string> = {
  "record.view": "مشاهده‌ی پرونده‌ی مراجع",
  "report.view": "مشاهده‌ی گزارش تست",
  "note.add": "ثبت یادداشت بالینی",
  "access.grant": "اجازه‌ی دسترسی به پرونده",
  "access.revoke": "لغو دسترسی به پرونده",
  "referral.accept": "پذیرش ارجاع (دسترسی به پرونده)",
  "role.change": "تغییر نقش کاربر",
  "clinician.review": "بررسی درخواست متخصص",
  "document.view": "مشاهده‌ی مدرک متخصص",
  "certificate.toggle": "ابطال/بازگرداندن گواهی",
  "enroll.manual": "ثبت‌نام دستی در دوره",
  "course.delete": "حذف دوره",
  "norm.change": "تغییر هنجار تست",
  "coupon.create": "ساخت کد تخفیف",
  "payout.decide": "بررسی درخواست تسویه",
  "commission.change": "تغییر کمیسیون سایت",
  "wallet.adjust": "اصلاح موجودی متخصص",
};

type Entry = { targetType?: string; targetId?: string; patientId?: string | null; meta?: Record<string, unknown> };

/**
 * ثبت یک رویداد حساس. رویدادهای «مشاهده» از یک نفر روی یک مورد در ۳۰ دقیقه فقط یک بار ثبت می‌شوند.
 * خطای ثبت هرگز کار اصلی را متوقف نمی‌کند.
 */
export async function audit(actorId: string | null, action: string, e: Entry = {}) {
  try {
    if (action.endsWith(".view")) {
      const recent = await db.auditLog.findFirst({
        where: { actorId, action, targetId: e.targetId ?? null, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
        select: { id: true },
      });
      if (recent) return;
    }
    await db.auditLog.create({
      data: {
        actorId,
        action,
        targetType: e.targetType ?? null,
        targetId: e.targetId ?? null,
        patientId: e.patientId ?? null,
        meta: JSON.stringify(e.meta ?? {}),
      },
    });
  } catch (err) {
    console.error("audit failed", err);
  }
}
