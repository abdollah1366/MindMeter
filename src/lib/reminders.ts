import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { formatTehran } from "@/lib/tehran-time";
import { displayName } from "@/lib/clinicians";
import { autoCompleteVisits } from "@/lib/wallet";

const MIN = 60_000;
const HOUR = 60 * MIN;

/** پنجره‌های یادآوری: «۲۴ ساعت قبل» و «۱ ساعت قبل» */
const WINDOWS = [
  { suffix: "24H", from: 2 * HOUR, to: 26 * HOUR, label: "فردا" },
  { suffix: "1H", from: 0, to: 70 * MIN, label: "به‌زودی" },
] as const;

/** فقط یک بار برای هر (نوع، مورد، کاربر) ثبت و true برمی‌گرداند */
async function claim(kind: string, targetId: string, userId: string) {
  try {
    await db.reminderLog.create({ data: { kind, targetId, userId } });
    return true;
  } catch {
    return false; // قبلاً ارسال شده (unique)
  }
}

/**
 * ارسال یادآوری نوبت‌های تأییدشده و کلاس‌های زنده.
 * باید هر ۱۰ تا ۱۵ دقیقه یک بار اجرا شود (cron سرور یا سرویس‌هایی مثل cron-job.org).
 * نوبت ۲۴ ساعته فقط برای جلسه‌هایی است که بیش از ۲ ساعت به آن‌ها مانده تا با یادآوری ۱ ساعته تداخل نکند.
 */
export async function runReminders(now = new Date()) {
  let sent = 0;
  for (const w of WINDOWS) {
    const range = { gt: new Date(now.getTime() + w.from), lte: new Date(now.getTime() + w.to) };

    const appts = await db.appointment.findMany({
      where: { status: "CONFIRMED", startsAt: range },
      include: { patient: true, clinician: { include: { user: true } } },
    });
    for (const a of appts) {
      const when = formatTehran(a.startsAt);
      const url = `/visit/${a.id}`;
      if (await claim(`APPT_${w.suffix}`, a.id, a.patientId)) {
        await notify(a.patientId, {
          title: w.suffix === "1H" ? "ویزیت آنلاین شما به‌زودی شروع می‌شود" : "یادآوری ویزیت آنلاین",
          body: `جلسه با ${a.clinician.title} ${displayName(a.clinician.user)} - ${when}`,
          url,
          sms: true,
        });
        sent++;
      }
      if (await claim(`APPT_${w.suffix}`, a.id, a.clinician.userId)) {
        await notify(a.clinician.userId, {
          title: w.suffix === "1H" ? "جلسه‌ی بعدی شما به‌زودی شروع می‌شود" : "یادآوری جلسه‌ی فردا",
          body: `ویزیت با ${displayName(a.patient)} - ${when}`,
          url,
          sms: true,
        });
        sent++;
      }
    }

    const lessons = await db.lesson.findMany({
      where: { kind: "LIVE", liveAt: range, course: { status: "PUBLISHED" } },
      include: { course: { include: { enrollments: { where: { status: "ACTIVE" }, select: { userId: true } } } } },
    });
    for (const l of lessons) {
      for (const e of l.course.enrollments) {
        if (!(await claim(`LIVE_${w.suffix}`, l.id, e.userId))) continue;
        await notify(e.userId, {
          title: w.suffix === "1H" ? "کلاس زنده به‌زودی شروع می‌شود" : "یادآوری کلاس زنده",
          body: `${l.title} (${l.course.title}) - ${formatTehran(l.liveAt!)}`,
          url: `/academy/${l.course.slug}/lessons/${l.id}`,
          sms: true,
        });
        sent++;
      }
    }
  }
  // ویزیت‌های رهاشده تکمیل و درآمد متخصص ثبت می‌شود
  const completed = await autoCompleteVisits(now);
  // سوابق قدیمی یادآوری لازم نیست
  await db.reminderLog.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - 30 * 24 * HOUR) } } });
  return { sent, completed };
}
