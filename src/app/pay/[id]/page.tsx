import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { displayName } from "@/lib/clinicians";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { PAYMENT_HOLD_MIN, releaseStaleHolds } from "@/lib/scheduling";
import { toPersianDigits } from "@/lib/scoring";
import { startPayment } from "@/server/booking";

export const metadata: Metadata = { title: "پرداخت" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ failed?: string }> };

export default async function PayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { failed } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/pay/${id}`);
  await releaseStaleHolds();
  const payment = await db.payment.findUnique({
    where: { id },
    include: { appointment: { include: { clinician: { include: { user: true } } } } },
  });
  if (!payment || payment.userId !== user.id) notFound();
  if (payment.status === "PAID") redirect(`/appointments?paid=${payment.appointmentId}`);
  const a = payment.appointment;
  const expired = !a || a.status !== "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-extrabold">پرداخت هزینه‌ی ویزیت</h1>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
        {a && (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">متخصص</dt>
              <dd className="font-medium">
                {a.clinician.title} {displayName(a.clinician.user)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">زمان</dt>
              <dd className="font-medium">{formatTehran(a.startsAt)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">مبلغ قابل پرداخت</dt>
              <dd className="text-lg font-extrabold text-brand-700">{formatToman(payment.amount)}</dd>
            </div>
          </dl>
        )}

        {failed && !expired && (
          <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">پرداخت انجام نشد یا لغو شد. می‌توانید دوباره تلاش کنید.</p>
        )}

        {expired ? (
          <div className="mt-6 text-sm leading-7 text-slate-600">
            <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
              مهلت پرداخت این نوبت تمام شده و زمان آزاد شده است. لطفاً دوباره نوبت بگیرید.
            </p>
            {a && (
              <Link href={`/clinicians/${a.clinicianId}#booking`} className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2 text-white">
                رزرو دوباره
              </Link>
            )}
          </div>
        ) : (
          <form action={startPayment} className="mt-6">
            <input type="hidden" name="paymentId" value={payment.id} />
            <button className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700">
              {payment.provider === "DEV" ? "پرداخت آزمایشی (حالت توسعه)" : "پرداخت با زرین‌پال"}
            </button>
            <p className="mt-3 text-center text-xs leading-6 text-slate-400">
              این نوبت تا {toPersianDigits(PAYMENT_HOLD_MIN)} دقیقه برای شما نگه داشته می‌شود.
              {payment.provider === "DEV" && " در حالت توسعه پولی جابه‌جا نمی‌شود."}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
