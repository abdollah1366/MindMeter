import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireClinician } from "@/lib/auth/guards";
import { LEDGER_LABEL, MIN_PAYOUT, balanceOf, commissionPercent } from "@/lib/wallet";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";
import StateForm from "@/components/academy/StateForm";
import { inputCls } from "@/components/academy/CourseFields";
import { requestPayout, saveIban } from "@/server/wallet";

export const metadata: Metadata = { title: "کیف پول" };

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "در حال بررسی", cls: "bg-amber-50 text-amber-700" },
  PAID: { label: "واریز شد", cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "رد شد", cls: "bg-rose-50 text-rose-700" },
};

export default async function WalletPage() {
  const { profile } = await requireClinician("/panel/wallet");
  const [balance, entries, payouts, percent, earned] = await Promise.all([
    balanceOf(profile.id),
    db.ledgerEntry.findMany({ where: { clinicianId: profile.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.payout.findMany({ where: { clinicianId: profile.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    commissionPercent(),
    db.ledgerEntry.aggregate({ where: { clinicianId: profile.id, kind: { in: ["VISIT", "COURSE"] } }, _sum: { amount: true, commission: true } }),
  ]);
  const pending = payouts.find((p) => p.status === "REQUESTED");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">موجودی قابل تسویه</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{formatToman(balance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">کل درآمد خالص</p>
          <p className="mt-1 text-2xl font-extrabold">{formatToman(earned._sum.amount ?? 0)}</p>
          <p className="mt-1 text-xs text-slate-400">کمیسیون سایت: {formatToman(earned._sum.commission ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">کمیسیون فعلی سایت</p>
          <p className="mt-1 text-2xl font-extrabold">{toPersianDigits(percent)}٪</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">درآمد ویزیت پس از پایان جلسه و سهم فروش دوره پس از پرداخت ثبت می‌شود.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold">حساب بانکی</h2>
          <StateForm action={saveIban} className="mt-4 grid gap-3" okText="حساب ذخیره شد.">
            <label>
              <span className="text-xs text-slate-600">شماره‌ی شبا</span>
              <input name="iban" dir="ltr" required defaultValue={profile.iban ?? ""} placeholder="IR000000000000000000000000" className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-slate-600">نام صاحب حساب</span>
              <input name="ibanOwner" required defaultValue={profile.ibanOwner ?? ""} className={inputCls} />
            </label>
          </StateForm>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold">درخواست تسویه</h2>
          {pending ? (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              درخواست {formatToman(pending.amount)} در حال بررسی است. پس از واریز، اعلان و پیامک دریافت می‌کنید.
            </p>
          ) : (
            <StateForm action={requestPayout} className="mt-4 grid gap-3" submit="ثبت درخواست تسویه" okText="درخواست ثبت شد.">
              <label>
                <span className="text-xs text-slate-600">مبلغ (تومان؛ خالی = کل موجودی)</span>
                <input name="amount" inputMode="numeric" placeholder={String(balance)} className={inputCls} />
              </label>
              <p className="text-xs text-slate-400">حداقل مبلغ تسویه {formatToman(MIN_PAYOUT)} است. واریز معمولاً تا ۳ روز کاری انجام می‌شود.</p>
            </StateForm>
          )}
          {payouts.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
                  <span>{formatToman(p.amount)}</span>
                  <span className="text-xs text-slate-400">{formatTehran(p.createdAt, { dateStyle: "medium" })}</span>
                  {p.reference && <span className="text-xs text-slate-500" dir="ltr">{p.reference}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${PAYOUT_STATUS[p.status].cls}`}>{PAYOUT_STATUS[p.status].label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="font-extrabold">گردش حساب</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">هنوز گردشی ثبت نشده است.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-start">تاریخ</th>
                  <th className="py-2 text-start">شرح</th>
                  <th className="py-2 text-start">مبلغ کل</th>
                  <th className="py-2 text-start">کمیسیون</th>
                  <th className="py-2 text-start">مبلغ خالص</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="py-2 text-xs text-slate-500">{formatTehran(e.createdAt, { dateStyle: "medium" })}</td>
                    <td className="py-2">
                      {LEDGER_LABEL[e.kind] ?? e.kind}
                      {e.note && <span className="text-xs text-slate-400"> · {e.note}</span>}
                    </td>
                    <td className="py-2 text-slate-500">{e.gross ? formatToman(e.gross) : "-"}</td>
                    <td className="py-2 text-slate-500">{e.commission ? formatToman(e.commission) : "-"}</td>
                    <td className={`py-2 font-bold ${e.amount < 0 ? "text-rose-600" : "text-emerald-700"}`} dir="ltr">
                      {e.amount < 0 ? "−" : "+"}
                      {Math.abs(e.amount).toLocaleString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
