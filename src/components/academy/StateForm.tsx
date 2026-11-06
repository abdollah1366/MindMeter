"use client";

import { useActionState, startTransition } from "react";

type State = { error?: string; ok?: boolean };

/** فرم عمومی با نمایش خطا یا «ذخیره شد» برای اکشن‌های سرور */
export default function StateForm({
  action,
  children,
  submit = "ذخیره",
  className = "grid gap-4",
  okText = "ذخیره شد.",
  buttonClass = "rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60",
}: {
  action: (s: State, f: FormData) => Promise<State>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  okText?: string;
  buttonClass?: string;
}) {
  const [state, run, pending] = useActionState<State, FormData>(action, {});
  return (
    <form
      className={className}
      onSubmit={(e) => {
        // جلوگیری از پاک شدن خودکار فرم در React 19 تا کاربر پس از خطا مقادیرش را از دست ندهد
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={buttonClass}>
          {pending ? "در حال ذخیره…" : submit}
        </button>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.ok && !pending && <p className="text-sm text-emerald-600">{okText}</p>}
      </div>
    </form>
  );
}
