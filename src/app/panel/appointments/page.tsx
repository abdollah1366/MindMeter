import type { Metadata } from "next";
import Link from "next/link";
import { requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { APPOINTMENT_STATUS, canJoin, releaseStaleHolds, visitWindow } from "@/lib/scheduling";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";
import { cancelAppointment } from "@/server/booking";

export const metadata: Metadata = { title: "نوبت‌ها" };

export default async function PanelAppointments() {
  const { profile } = await requireClinician();
  await releaseStaleHolds();
  const [list, slotsCount] = await Promise.all([
    db.appointment.findMany({
      where: { clinicianId: profile.id, status: { not: "PENDING_PAYMENT" } },
      include: { patient: true },
      orderBy: { startsAt: "asc" },
    }),
    db.availability.count({ where: { clinicianId: profile.id } }),
  ]);
  const now = new Date();
  const upcoming = list.filter((a) => ["CONFIRMED", "IN_PROGRESS"].includes(a.status) && visitWindow(a).closesAt >= now);
  const past = list.filter((a) => !upcoming.includes(a)).reverse();

  return (
    <>
      <h1 className="text-xl font-extrabold">نوبت‌های پیش رو ({toPersianDigits(upcoming.length)})</h1>
      {slotsCount === 0 && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          هنوز ساعت کاری ثبت نکرده‌اید و مراجعان نمی‌توانند نوبت بگیرند.{" "}
          <Link href="/panel/schedule" className="font-bold underline">تنظیم برنامه‌ی کاری</Link>
        </p>
      )}
      {upcoming.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">نوبت پیش رویی ندارید.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {upcoming.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="font-bold">
                  {displayName(a.patient)}
                  <span className={`ms-2 rounded-full px-2 py-0.5 text-xs font-normal ${APPOINTMENT_STATUS[a.status].style}`}>
                    {APPOINTMENT_STATUS[a.status].label}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatTehran(a.startsAt)} · {formatToman(a.price)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {canJoin(a, now) ? (
                  <Link href={`/visit/${a.id}`} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
                    شروع ویزیت
                  </Link>
                ) : (
                  <span className="rounded-xl bg-surface px-4 py-2 text-slate-500">ورود از ۱۰ دقیقه قبل</span>
                )}
                <Link href={`/panel/patients/${a.patientId}`} className="rounded-xl border border-slate-200 px-4 py-2">پرونده</Link>
                {a.status === "CONFIRMED" && (
                  <form action={cancelAppointment} className="flex gap-2">
                    <input type="hidden" name="appointmentId" value={a.id} />
                    <input name="reason" placeholder="دلیل لغو (اختیاری)" className="w-36 rounded-xl border border-slate-200 px-2 text-xs" />
                    <button className="rounded-xl border border-rose-200 px-4 py-2 text-rose-700">لغو</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 font-bold">سابقه</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {past.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 first:border-0">
                    <td className="p-3">
                      <Link href={`/panel/patients/${a.patientId}`} className="hover:text-brand-600">{displayName(a.patient)}</Link>
                    </td>
                    <td className="p-3 text-slate-500">{formatTehran(a.startsAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${APPOINTMENT_STATUS[a.status].style}`}>{APPOINTMENT_STATUS[a.status].label}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{a.cancelReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
