import type { Metadata } from "next";
import { lookupCertificate } from "@/server/academy";

export const metadata: Metadata = {
  title: "استعلام گواهی آکادمی",
  description: "بررسی اعتبار گواهی‌های پایان دوره‌ی آکادمی مایندمتر با کد استعلام.",
};

type Props = { searchParams: Promise<{ invalid?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { invalid } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">استعلام گواهی</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">کد درج‌شده روی گواهی (مثل MM-ABCD-2345) را وارد کنید.</p>
      <form action={lookupCertificate} className="mt-5 flex gap-2">
        <input name="code" required dir="ltr" placeholder="MM-XXXX-XXXX" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center font-mono uppercase outline-none focus:border-brand-500" />
        <button className="rounded-xl bg-brand-600 px-5 font-bold text-white hover:bg-brand-700">استعلام</button>
      </form>
      {invalid && <p className="mt-3 text-sm text-rose-600">کد واردشده درست نیست. کد ۸ حرفی بعد از MM را کامل وارد کنید.</p>}
    </div>
  );
}
