"use client";

import { useActionState } from "react";
import { applyReferralCode } from "@/server/referral-credit";

export default function ApplyReferralForm() {
  const [state, action, pending] = useActionState(applyReferralCode, {});
  return (
    <form action={action} className="mt-3 flex flex-wrap gap-2">
      <input name="code" placeholder="کد معرف" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
      <button disabled={pending} className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "در حال ثبت…" : "ثبت"}
      </button>
      {state?.error ? <p className="w-full text-sm text-rose-700">{state.error}</p> : null}
      {state?.ok ? <p className="w-full text-sm text-emerald-700">کد معرف با موفقیت ثبت شد. اعتبار به حساب شما و دوستتان اضافه شد.</p> : null}
    </form>
  );
}
