import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { displayName, CLINICIAN_KIND } from "@/lib/clinicians";
import { APPOINTMENT_STATUS, REFERRAL_STATUS, canJoin, releaseStaleHolds, visitWindow } from "@/lib/scheduling";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { cancelAppointment } from "@/server/booking";
import { closeReferral } from "@/server/referral";

export const metadata: Metadata = { title: "نوبت‌های من" };

type Props = { searchParams: Promise<{ paid?: string; booked?: string; referral?: string }> };

const KIND_LABEL: Record<string, string> = { ANY: "فرقی ندارد", ...CLINICIAN_KIND };

export default async function AppointmentsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/appointments");
  const sp = await searchParams;
  await releaseStaleHolds();

  const [appointments, referrals] = await Promise.all([
    db.appointment.findMany({
      where: { patientId: user.id },
      include: {
        clinician: { include: { user: true } },
        payments: { where: { status: { not: "PAID" } }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { startsAt: "desc" },
    }),
    db.referral.findMany({
      where: { patientId: user.id },
      include: { toClinician: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const now = new Date();
  const upcoming = appointments.filter((a) => visitWindow(a).closesAt >= now && a.status !== "CANCELLED" && a.status !== "COMPLETED").reverse();
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">نوبت‌ها و ارجاع‌های من</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/clinicians" className="rounded-xl bg-brand-600 px-4 py-2 text-white">رزرو نوبت جدید</Link>
          <Link href="/referral/new" className="rounded-xl border border-brand-200 px-4 py-2 text-brand-700">درخواست مشاوره</Link>
        </div>
      </div>

      {(sp.paid || sp.booked) && (
        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ نوبت شما قطعی شد. ده دقیقه قبل از شروع، دکمه‌ی «ورود به ویزیت» فعال می‌شود.
        </p>
      )}
      {sp.referral && (
        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ درخواست شما ثبت شد. وقتی متخصصی آن را بپذیرد، در همین صفحه می‌بینید و می‌توانید نوبت بگیرید.
        </p>
      )}

      <h2 className="mt-8 font-bold">نوبت‌های پیش رو</h2>
      {upcoming.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">نوبت فعالی ندارید.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {upcoming.map((a) => {
            const st = APPOINTMENT_STATUS[a.status];
            const join = canJoin(a, now);
            const cancellable = a.status === "PENDING_PAYMENT" || (a.status === "CONFIRMED" && a.startsAt.getTime() - now.getTime() >= 24 * 3600_000);
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="font-bold">
                    {a.clinician.title} {displayName(a.clinician.user)}
                    <span className={`ms-2 rounded-full px-2 py-0.5 text-xs font-normal ${st.style}`}>{st.label}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatTehran(a.startsAt)} · {formatToman(a.price)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {join && (
                    <Link href={`/visit/${a.id}`} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
                      ورود به ویزیت
                    </Link>
                  )}
                  {!join && a.status === "CONFIRMED" && (
                    <span className="rounded-xl bg-surface px-4 py-2 text-slate-500">ورود از ۱۰ دقیقه قبل</span>
                  )}
                  {a.status === "PENDING_PAYMENT" && a.payments[0] && (
                    <Link href={`/pay/${a.payments[0].id}`} className="rounded-xl bg-brand-600 px-4 py-2 text-white">پرداخت</Link>
                  )}
                  {cancellable && (
                    <form action={cancelAppointment}>
                      <input type="hidden" name="appointmentId" value={a.id} />
                      <button className="rounded-xl border border-rose-200 px-4 py-2 text-rose-700">لغو نوبت</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-400">لغو نوبت قطعی تا ۲۴ ساعت پیش از شروع ممکن است.</p>
        </div>
      )}

      <h2 className="mt-10 font-bold">درخواست‌های مشاوره و ارجاع</h2>
      {referrals.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          درخواستی ندارید. اگر نتیجه‌ی تستی نگرانتان کرده،{" "}
          <Link href="/referral/new" className="text-brand-600 underline">درخواست مشاوره</Link> بدهید تا متخصص مناسب به شما معرفی شود.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {referrals.map((r) => {
            const st = REFERRAL_STATUS[r.status];
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-500">
                    {formatTehran(r.createdAt, { dateStyle: "medium" })} · متخصص: {KIND_LABEL[r.preferredKind] ?? r.preferredKind}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${st.style}`}>{st.label}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-700">{r.reason}</p>
                {r.toClinician && (
                  <p className="mt-2 text-sm">
                    متخصص: <Link href={`/clinicians/${r.toClinician.id}`} className="font-medium text-brand-700">{r.toClinician.title} {displayName(r.toClinician.user)}</Link>
                  </p>
                )}
                {r.responseNote && <p className="mt-2 rounded-xl bg-surface p-3 text-sm text-slate-600">پاسخ متخصص: {r.responseNote}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {r.status === "ACCEPTED" && r.toClinician && (
                    <Link href={`/clinicians/${r.toClinician.id}?referral=${r.id}#booking`} className="rounded-xl bg-brand-600 px-4 py-2 text-white">
                      رزرو نوبت با این متخصص
                    </Link>
                  )}
                  {(r.status === "NEW" || r.status === "ACCEPTED") && (
                    <form action={closeReferral}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600">بستن درخواست</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 font-bold">سابقه‌ی نوبت‌ها</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {past.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 first:border-0">
                    <td className="p-3">{a.clinician.title} {displayName(a.clinician.user)}</td>
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
    </div>
  );
}
