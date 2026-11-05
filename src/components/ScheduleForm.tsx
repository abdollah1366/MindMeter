"use client";

import { useActionState } from "react";
import { saveSchedule, type ScheduleState } from "@/server/booking";

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

type Props = {
  sessionPrice: number;
  sessionMinutes: number;
  acceptsOnline: boolean;
  days: string[];
};

export default function ScheduleForm({ sessionPrice, sessionMinutes, acceptsOnline, days }: Props) {
  const [state, action, pending] = useActionState<ScheduleState, FormData>(saveSchedule, {});
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600">تعرفه‌ی هر جلسه (تومان)</span>
          <input
            name="sessionPrice"
            defaultValue={sessionPrice}
            inputMode="numeric"
            dir="ltr"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-slate-400">۰ یعنی رایگان</span>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">مدت هر جلسه</span>
          <select name="sessionMinutes" defaultValue={sessionMinutes} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
            {[30, 45, 50, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m.toLocaleString("fa-IR")} دقیقه
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-center text-sm">
          <input type="checkbox" name="acceptsOnline" defaultChecked={acceptsOnline} className="h-4 w-4 accent-brand-600" />
          پذیرش ویزیت آنلاین فعال است
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">ساعات کاری هفتگی</h2>
        <p className="mt-1 text-sm leading-7 text-slate-500">
          برای هر روز بازه‌ها را به شکل <span dir="ltr" className="font-mono">09:00-13:00, 16:00-20:00</span> بنویسید. روزهای تعطیل را خالی
          بگذارید. زمان‌ها به وقت تهران است.
        </p>
        <div className="mt-4 space-y-3">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 font-medium text-slate-700">{d}</span>
              <input
                name={`day${i}`}
                defaultValue={days[i]}
                dir="ltr"
                placeholder="—"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
              />
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">✓ برنامه‌ی کاری ذخیره شد.</p>}
      <button disabled={pending} className="rounded-xl bg-brand-600 px-6 py-2.5 text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "در حال ذخیره…" : "ذخیره‌ی برنامه"}
      </button>
    </form>
  );
}
