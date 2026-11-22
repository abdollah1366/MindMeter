import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeIranMobile } from "@/lib/validation";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "تغییر رمز عبور" };

type Props = { searchParams: Promise<{ phone?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { phone: raw } = await searchParams;
  const phone = normalizeIranMobile(raw ?? "");
  if (!phone) redirect("/forgot-password");

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-extrabold">تغییر رمز عبور</h1>
        <p className="mt-2 mb-6 text-sm leading-7 text-slate-500">
          کد ارسال‌شده به <span dir="ltr">{phone}</span> را به همراه رمز عبور جدید وارد کنید.
        </p>
        <ResetPasswordForm phone={phone} />
      </div>
      <p className="mt-4 text-center text-xs">
        <Link href="/forgot-password" className="text-slate-500 hover:text-brand-600">→ ارسال مجدد کد</Link>
      </p>
    </div>
  );
}
