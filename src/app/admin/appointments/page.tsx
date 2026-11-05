import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { APPOINTMENT_STATUS, releaseStaleHolds } from "@/lib/scheduling";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "نوبت‌ها و پرداخت‌ها" };

const PAY_STATUS: Record<string, { label: string; style: string }> = {
  PENDING: { label: "در انتظار", style: "bg-amber-50 text-amber-700" },
  PAID: { label: "پرداخت‌شده", style: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "ناموفق", style: "bg-rose-50 text-rose-700" },
};

export default async function AdminAppointments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await releaseStaleHolds();
  const [appointments, payments, revenue] = await Promise.all([
    db.appointment.findMany({
      where: status ? { status } : {},
      include: { patient: true, clinician: { include: { user: true } } },
      orderBy: { startsAt: "desc" },
      take: 100,
    }),
    db.payment.findMany({ include: { user: true, appointment: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);
  // پرداخت موفقی که نوبتش لغو شده باید بازگردانده شود
  const refunds = payments.filter((p) => p.status === "PAID" && p.appointment?.status === "CANCELLED");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">نوبت‌ها و پرداخت‌ها</h1>
        <p className="text-sm text-slate-500">
          جمع پرداخت‌های موفق: <span className="font-bold text-brand-700">{formatToman(revenue._sum.amount ?? 0)}</span>
        </p>
      </div>

      {refunds.length > 0 && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-bold">⚠ {toPersianDigits(refunds.length)} پرداخت برای نوبت لغوشده نیاز به بازگشت وجه دارد:</p>
          <ul className="mt-2 list-inside list-disc">
            {refunds.map((p) => (
              <li key={p.id}>
                {displayName(p.user)} ({toPersianDigits(p.user.phone)}) · {formatToman(p.amount)} · کد پیگیری <span dir="ltr">{p.refId}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/appointments" className={`rounded-xl px-3 py-1.5 ${!status ? "bg-brand-600 text-white" : "bg-white"}`}>همه</Link>
        {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => (
          <Link key={k} href={`/admin/appointments?status=${k}`} className={`rounded-xl px-3 py-1.5 ${status === k ? "bg-brand-600 text-white" : "bg-white"}`}>
            {v.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-slate-500">
            <tr>
              <th className="p-3 text-start">زمان</th>
              <th className="p-3 text-start">مراجع</th>
              <th className="p-3 text-start">متخصص</th>
              <th className="p-3 text-start">مبلغ</th>
              <th className="p-3 text-start">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">نوبتی نیست.</td></tr>
            )}
            {appointments.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="p-3">{formatTehran(a.startsAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="p-3">{displayName(a.patient)}</td>
                <td className="p-3">{a.clinician.title} {displayName(a.clinician.user)}</td>
                <td className="p-3">{formatToman(a.price)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${APPOINTMENT_STATUS[a.status].style}`}>{APPOINTMENT_STATUS[a.status].label}</span>
                  {a.cancelReason && <p className="mt-1 text-xs text-slate-400">{a.cancelReason}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-extrabold">آخرین پرداخت‌ها</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-slate-500">
            <tr>
              <th className="p-3 text-start">تاریخ</th>
              <th className="p-3 text-start">کاربر</th>
              <th className="p-3 text-start">مبلغ</th>
              <th className="p-3 text-start">درگاه</th>
              <th className="p-3 text-start">کد پیگیری</th>
              <th className="p-3 text-start">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">پرداختی ثبت نشده است.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3">{formatTehran(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="p-3">{displayName(p.user)}</td>
                <td className="p-3">{formatToman(p.amount)}</td>
                <td className="p-3">{p.provider === "DEV" ? "آزمایشی" : "زرین‌پال"}</td>
                <td className="p-3 font-mono text-xs" dir="ltr">{p.refId ?? "-"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${PAY_STATUS[p.status].style}`}>{PAY_STATUS[p.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
