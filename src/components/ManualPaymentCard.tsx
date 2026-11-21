"use client";

import { useActionState } from "react";
import { submitManualPaymentTicket } from "@/server/manual-payment";
const MANUAL_CARD_NUMBER = "6037997595607244";
const MANUAL_CARD_HOLDER = "عبدالله براتی";
const MANUAL_BANK = "بانک ملی";
import { formatToman } from "@/lib/tehran-time";

export default function ManualPaymentCard({ paymentId, amount }: { paymentId: string; amount: number }) {
  const [state, action, pending] = useActionState(submitManualPaymentTicket, {});
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
      <h3 className="font-bold">پرداخت دستی (کارت به کارت)</h3>
      <p className="mt-2">
        مبلغ {formatToman(amount)} را به شماره کارت زیر واریز کنید و سپس فرم زیر را تکمیل نمایید تا پشتیبانی حساب شما را
        فعال کند.
      </p>
      <dl className="mt-3 space-y-1 rounded-xl bg-white/60 p-3">
        <div className="flex justify-between gap-3">
          <dt>شماره کارت</dt>
          <dd dir="ltr" className="font-bold">{MANUAL_CARD_NUMBER}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>نام صاحب حساب</dt>
          <dd className="font-bold">{MANUAL_CARD_HOLDER}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>بانک</dt>
          <dd className="font-bold">{MANUAL_BANK}</dd>
        </div>
      </dl>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="paymentId" value={paymentId} />
        <input
          name="reference"
          placeholder="شماره پیگیری یا ۴ رقم آخر کارت"
          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
        />
        <textarea
          name="body"
          rows={2}
          placeholder="توضیحات (اختیاری)"
          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
        />
        <button disabled={pending} className="w-full rounded-xl bg-amber-600 py-2.5 font-bold text-white hover:bg-amber-700 disabled:opacity-60">
          {pending ? "در حال ثبت…" : "ثبت درخواست پرداخت دستی"}
        </button>
      </form>
      {state?.error ? <p className="mt-2 text-sm text-rose-700">{state.error}</p> : null}
      <p className="mt-3 text-xs text-amber-800/80">
        پس از بررسی توسط پشتیبانی، حساب/خرید شما فعال می‌شود و از طریق تیکت به شما اطلاع داده خواهد شد.
      </p>
    </div>
  );
}
