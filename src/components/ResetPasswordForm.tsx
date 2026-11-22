"use client";

import { useActionState } from "react";
import { resetPassword } from "@/server/password-reset";

export default function ResetPasswordForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState(resetPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="phone" value={phone} />
      <label className="block">
        <span className="text-sm text-slate-600">کد تأیید</span>
        <input name="code" required inputMode="numeric" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500" dir="ltr" />
      </label>
      <label className="block">
        <span className="text-sm text-slate-600">رمز عبور جدید (حداقل ۸ کاراکتر)</span>
        <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>
      <label className="block">
        <span className="text-sm text-slate-600">تأیید رمز عبور</span>
        <input name="confirm" type="password" required minLength={8} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.</p>}
      <button disabled={pending} className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "در حال ثبت…" : "تغییر رمز عبور"}
      </button>
    </form>
  );
}
