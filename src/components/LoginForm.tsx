"use client";

import { useActionState } from "react";
import { requestCode, verifyCode, type LoginState } from "@/server/auth";
import { toPersianDigits } from "@/lib/scoring";

export default function LoginForm({ next }: { next: string }) {
  const [sendState, send, sending] = useActionState<LoginState, FormData>(requestCode, { step: "phone" });
  const [verifyState, verify, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });

  const onCodeStep = sendState.step === "code" && sendState.phone;
  const error = onCodeStep ? verifyState.error ?? sendState.error : sendState.error;

  if (!onCodeStep) {
    return (
      <form action={send} className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600">شماره موبایل</span>
          <input
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            dir="ltr"
            placeholder="09121234567"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-brand-500"
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={sending} className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
          {sending ? "در حال ارسال…" : "دریافت کد تأیید"}
        </button>
      </form>
    );
  }

  return (
    <form action={verify} className="space-y-4">
      <input type="hidden" name="phone" value={sendState.phone} />
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-slate-600">
        {sendState.info ?? "کد تأیید ارسال‌شده را وارد کنید."} <span dir="ltr">{toPersianDigits(sendState.phone!)}</span>
      </p>
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        autoFocus
        dir="ltr"
        maxLength={6}
        placeholder="- - - - -"
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl tracking-[0.6em] outline-none focus:border-brand-500"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button disabled={verifying} className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {verifying ? "در حال بررسی…" : "ورود"}
      </button>
      <button formAction={send} formNoValidate className="w-full text-sm text-slate-500 hover:text-brand-600">
        ارسال دوباره‌ی کد
      </button>
    </form>
  );
}
