import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { adjustUserCredit } from "@/server/referral-credit";
import { formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "مدیریت اعتبار کاربران", robots: { index: false } };

export default async function AdminCreditsPage() {
  await requireAdmin();
  const users = await db.user.findMany({
    where: { creditBalance: { not: 0 } },
    orderBy: { creditBalance: "desc" },
    take: 50,
    select: { id: true, username: true, firstName: true, lastName: true, creditBalance: true },
  });
  const recent = await db.creditTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { username: true, firstName: true, lastName: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">مدیریت اعتبار کاربران</h1>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-brand-600">→ پنل ادمین</Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">اصلاح دستی اعتبار</h2>
        <p className="mt-2 text-xs text-slate-500">
          مبلغ مثبت برای افزایش و منفی برای کسر. برای فعال‌سازی حساب پس از پرداخت دستی، مبلغ پرداختی را وارد کنید.
        </p>
        <form action={adjustUserCredit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="userId" placeholder="شناسه کاربر (User ID)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" required />
          <input name="amount" placeholder="مبلغ (تومان)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" required />
          <input name="note" placeholder="دلیل اصلاح (حداقل ۳ حرف)" className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" required />
          <button className="sm:col-span-2 rounded-xl bg-brand-600 py-2.5 font-bold text-white hover:bg-brand-700">اعمال</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">کاربران دارای اعتبار</h2>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">موردی یافت نشد.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2 text-start">کاربر</th>
                  <th className="p-2 text-start">شناسه</th>
                  <th className="p-2 text-start">اعتبار</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="p-2">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "—"}</td>
                    <td className="p-2 font-mono text-xs" dir="ltr">{u.id}</td>
                    <td className="p-2 font-bold text-brand-700">{formatToman(u.creditBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">تراکنش‌های اخیر</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">تراکنشی یافت نشد.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <span>
                  {[t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.username || "—"} — {t.kind}
                  {t.note ? ` — ${t.note}` : ""}
                </span>
                <span className={`font-bold ${t.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {t.amount >= 0 ? "+" : ""}{formatToman(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
