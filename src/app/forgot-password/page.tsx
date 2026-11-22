import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "فراموشی رمز عبور" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-extrabold">فراموشی رمز عبور</h1>
        <p className="mt-2 mb-6 text-sm leading-7 text-slate-500">
          نام کاربری یا شماره موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود.
        </p>
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-center text-xs">
        <Link href="/login" className="text-slate-500 hover:text-brand-600">→ بازگشت به ورود</Link>
      </p>
    </div>
  );
}
