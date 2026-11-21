import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMyReferralCode, listMyReferrals, applyReferralCodeByValue } from "@/server/referral-credit";
import ApplyReferralForm from "@/components/ApplyReferralForm";
import CopyLink from "@/components/CopyLink";
import { formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "معرفی به دوستان", robots: { index: false } };

export default async function ReferralPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/referral");

  const { ref } = await searchParams;
  if (ref && !user.referredByUserId) {
    await applyReferralCodeByValue(user.id, ref);
    redirect("/referral");
  }

  const code = await getMyReferralCode();
  const invited = await listMyReferrals();
  const balance = (await db.user.findUnique({ where: { id: user.id }, select: { creditBalance: true } }))?.creditBalance ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-extrabold">معرفی به دوستان</h1>
      <p className="text-sm leading-7 text-slate-600">
        با معرفی دوستان خود به مایندمتر، هر کدام از شما اعتبار هدیه دریافت می‌کنید: معرف ۵۰,۰۰۰ تومان و دوست دعوت‌شده ۲۵,۰۰۰ تومان.
        اعتبار در خرید آزمون‌ها و دوره‌ها قابل استفاده است.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">اعتبار شما</h2>
        <p className="mt-2 text-2xl font-extrabold text-brand-700">{formatToman(balance)}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">کد معرف شما</h2>
        <p className="mt-2 text-xs text-slate-500">این کد را با دوستان خود به اشتراک بگذارید.</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="rounded-xl bg-slate-100 px-4 py-2 text-lg font-bold tracking-widest" dir="ltr">
            {code}
          </code>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          لینک ثبت‌نام: <span dir="ltr" className="text-brand-700">https://www.mindmetr.ir/signup?ref={code}</span>
        </p>
        <CopyLink url={`https://www.mindmetr.ir/signup?ref=${code}`} />
      </section>

      {!user.referredByUserId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">ثبت کد معرف دوست</h2>
          <p className="mt-2 text-xs text-slate-500">اگر با کد معرف دوستی ثبت‌نام کرده‌اید، آن را اینجا وارد کنید.</p>
          <ApplyReferralForm />
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">دوستان دعوت‌شده ({toPersianDigits(invited.length)})</h2>
        {invited.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">هنوز کسی را معرفی نکرده‌اید.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {invited.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "کاربر"}</span>
                <span className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString("fa-IR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/profile" className="text-sm text-slate-500 hover:text-brand-600">→ بازگشت به پروفایل</Link>
    </div>
  );
}
