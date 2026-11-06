import type { Metadata } from "next";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { commissionPercent } from "@/lib/wallet";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";
import StateForm from "@/components/academy/StateForm";
import { inputCls } from "@/components/academy/CourseFields";
import { adjustBalance, decidePayout, saveCommission } from "@/server/wallet";

export const metadata: Metadata = { title: "تسویه با متخصصان" };

export default async function PayoutsPage() {
  const [percent, requested, recent, balances, clinicians, totals] = await Promise.all([
    commissionPercent(),
    db.payout.findMany({ where: { status: "REQUESTED" }, include: { clinician: { include: { user: true } } }, orderBy: { createdAt: "asc" } }),
    db.payout.findMany({ where: { status: { not: "REQUESTED" } }, include: { clinician: { include: { user: true } } }, orderBy: { decidedAt: "desc" }, take: 20 }),
    db.ledgerEntry.groupBy({ by: ["clinicianId"], _sum: { amount: true } }),
    db.clinicianProfile.findMany({ where: { status: "APPROVED" }, include: { user: true } }),
    db.ledgerEntry.aggregate({ where: { kind: { in: ["VISIT", "COURSE"] } }, _sum: { commission: true, gross: true } }),
  ]);
  const bal = new Map(balances.map((b) => [b.clinicianId, b._sum.amount ?? 0]));
  const owed = [...bal.values()].reduce((s, v) => s + v, 0);

  return (
    <>
      <h1 className="text-2xl font-extrabold">کیف پول و تسویه با متخصصان</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">بدهی فعلی به متخصصان</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{formatToman(owed)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">کل کمیسیون سایت</p>
          <p className="mt-1 text-2xl font-extrabold">{formatToman(totals._sum.commission ?? 0)}</p>
          <p className="mt-1 text-xs text-slate-400">از فروش {formatToman(totals._sum.gross ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">کمیسیون سایت (٪)</p>
          <StateForm action={saveCommission} className="mt-2 flex items-center gap-2" submit="ذخیره" buttonClass="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">
            <input name="percent" inputMode="numeric" defaultValue={percent} className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center" />
          </StateForm>
          <p className="mt-1 text-xs text-slate-400">برای درآمدهای بعدی اعمال می‌شود.</p>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="font-extrabold">درخواست‌های در انتظار ({toPersianDigits(requested.length)})</h2>
        {requested.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">درخواستی در انتظار نیست.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requested.map((p) => (
              <li key={p.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <b>
                    {p.clinician.title} {displayName(p.clinician.user)}
                  </b>
                  <span className="text-lg font-extrabold text-brand-700">{formatToman(p.amount)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  شبا: <span dir="ltr" className="font-mono">{p.iban}</span> · صاحب حساب: {p.ibanOwner} · {formatTehran(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <form action={decidePayout} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="reference" dir="ltr" placeholder="شماره‌ی پیگیری واریز" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="note" placeholder="یادداشت (اختیاری)" className="min-w-40 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <button name="decision" value="PAID" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white">واریز شد</button>
                  <button name="decision" value="REJECTED" className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-700">رد</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold">موجودی متخصصان</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {clinicians
              .map((c) => ({ c, b: bal.get(c.id) ?? 0 }))
              .sort((a, b) => b.b - a.b)
              .map(({ c, b }) => (
                <li key={c.id} className="flex justify-between gap-2 py-2">
                  <span>
                    {c.title} {displayName(c.user)}
                    {!c.iban && <span className="ms-2 text-xs text-amber-600">(شبا ثبت نشده)</span>}
                  </span>
                  <span className="font-bold">{formatToman(b)}</span>
                </li>
              ))}
          </ul>
          <h3 className="mt-5 text-sm font-bold">اصلاح دستی موجودی</h3>
          <StateForm action={adjustBalance} className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]" submit="ثبت اصلاح" okText="ثبت شد.">
            <select name="clinicianId" className={inputCls + " mt-0"}>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>{c.title} {displayName(c.user)}</option>
              ))}
            </select>
            <input name="amount" dir="ltr" placeholder="-50000" className={inputCls + " mt-0"} />
            <input name="note" placeholder="دلیل، مثلاً بازپرداخت به مراجع" className={inputCls + " mt-0 sm:col-span-2"} />
          </StateForm>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold">تسویه‌های اخیر</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">هنوز تسویه‌ای انجام نشده است.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {recent.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {p.clinician.title} {displayName(p.clinician.user)} · {formatToman(p.amount)}
                  </span>
                  <span className={`text-xs ${p.status === "PAID" ? "text-emerald-700" : "text-rose-600"}`}>
                    {p.status === "PAID" ? `واریز (${p.reference})` : "رد شد"} · {p.decidedAt ? formatTehran(p.decidedAt, { dateStyle: "medium" }) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
