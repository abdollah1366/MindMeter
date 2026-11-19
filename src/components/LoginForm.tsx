"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signIn, signUp, type CredentialsState } from "@/server/auth";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500";
const buttonClass =
  "w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState<CredentialsState, FormData>(signIn, {});
  const [signupState, signupAction, signupPending] = useActionState<CredentialsState, FormData>(signUp, {});

  const passwordInput = (name: string, autoComplete: string, placeholder: string) => (
    <div className="relative">
      <input
        name={name}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={8}
        placeholder={placeholder}
        className={inputClass + " ps-16"}
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="absolute inset-y-0 start-0 mt-1 rounded-s-xl px-3 text-xs text-slate-500 hover:text-brand-600"
      >
        {showPassword ? "پنهان" : "نمایش"}
      </button>
    </div>
  );

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg py-2 text-sm font-bold transition ${mode === "login" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}
        >
          ورود
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-lg py-2 text-sm font-bold transition ${mode === "signup" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}
        >
          ثبتنام آسان
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="text-sm text-slate-600">نام کاربری</span>
            <input
              name="username"
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_]{3,30}"
              title="نام کاربری باید ۳ تا ۳۰ حرف لاتین، عدد یا زیرخط باشد"
              dir="ltr"
              placeholder="my_username"
              className={inputClass + " text-center"}
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">رمز عبور</span>
            {passwordInput("password", "current-password", "رمز عبور")}
          </label>
          {loginState.error && <p className="text-sm text-rose-600">{loginState.error}</p>}
          <button disabled={loginPending} className={buttonClass}>
            {loginPending ? "در حال ورود…" : "ورود"}
          </button>
        </form>
      ) : (
        <form action={signupAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="text-sm text-slate-600">نام کاربری</span>
            <input
              name="username"
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_]{3,30}"
              title="نام کاربری باید ۳ تا ۳۰ حرف لاتین، عدد یا زیرخط باشد"
              dir="ltr"
              placeholder="my_username"
              className={inputClass + " text-center"}
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">رمز عبور (حداقل ۸ کاراکتر)</span>
            {passwordInput("password", "new-password", "رمز عبور")}
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">تأیید رمز عبور</span>
            <input
              name="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="تکرار رمز عبور"
              className={inputClass}
            />
          </label>
          {signupState.error && <p className="text-sm text-rose-600">{signupState.error}</p>}
          <button disabled={signupPending} className={buttonClass}>
            {signupPending ? "در حال ساخت حساب…" : "ساخت حساب"}
          </button>
          <p className="text-center text-xs leading-6 text-slate-500">
            تنها نام کاربری و رمز لازم است؛ در مرحله بعد مشخصات خود را تکمیل میکنید.
          </p>
        </form>
      )}
    </div>
  );
}
