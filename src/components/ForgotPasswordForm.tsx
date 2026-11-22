"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/server/password-reset";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm text-slate-600">نام کاربری یا شماره موبایل</span>
        <input name="identifier" required className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-emerald-700">{state.info}</p>}
      {state?.phone && (
        <input type="hidden" name="phone" value={state.phone} />
      )}
      <button disabled={pending} className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "در حال ارسال…" : "ارسال کد تأیید"}
      </button>
      {state?.phone && (
        <a href={`/reset-password?phone=${encodeURIComponent(state.phone)}`} className="block text-center text-sm text-brand-600 hover:underline">
          رفتن به صفحه‌ی تغییر رمز
        </a>
      )}
    </form>
  );
}
