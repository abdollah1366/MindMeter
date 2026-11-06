"use client";

import { useActionState, useState } from "react";
import { enrollCourse, type EnrollState } from "@/server/academy";

export default function EnrollForm({ courseId, free, label }: { courseId: string; free: boolean; label: string }) {
  const [state, action, pending] = useActionState<EnrollState, FormData>(enrollCourse, {});
  const [showCoupon, setShowCoupon] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      {!free &&
        (showCoupon ? (
          <input
            name="coupon"
            dir="ltr"
            placeholder="کد تخفیف"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center uppercase outline-none focus:border-brand-500"
          />
        ) : (
          <button type="button" onClick={() => setShowCoupon(true)} className="text-xs text-calm-600 hover:underline">
            کد تخفیف دارید؟
          </button>
        ))}
      <button disabled={pending} className="w-full rounded-xl bg-warm-500 py-3 font-bold text-white hover:bg-warm-600 disabled:opacity-60">
        {pending ? "لطفاً صبر کنید…" : label}
      </button>
      {state.error && <p className="text-center text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}
