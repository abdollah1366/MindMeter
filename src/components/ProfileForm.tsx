"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "@/server/profile";
import { JALALI_MONTHS } from "@/lib/jalali";

export type ProfileDefaults = {
  firstName: string;
  lastName: string;
  nationalId: string;
  sex: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  education: string;
  city: string;
};

const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-500";

export default function ProfileForm({ defaults, next, years }: { defaults: ProfileDefaults; next: string; years: number[] }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  // بعد از ارسال، فرم با مقادیر واردشده دوباره ساخته می‌شود تا در صورت خطا پاک نشود
  const v = { ...defaults, ...state.values } as ProfileDefaults;

  return (
    <form key={JSON.stringify(state.values ?? null)} action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="next" value={next} />
      <label>
        <span className="text-sm text-slate-600">نام *</span>
        <input name="firstName" required defaultValue={v.firstName} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">نام خانوادگی *</span>
        <input name="lastName" required defaultValue={v.lastName} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">کد ملی *</span>
        <input name="nationalId" required inputMode="numeric" maxLength={10} dir="ltr" defaultValue={v.nationalId} className={input + " text-center tracking-widest"} />
      </label>
      <label>
        <span className="text-sm text-slate-600">جنسیت *</span>
        <select name="sex" required defaultValue={v.sex} className={input}>
          <option value="">انتخاب کنید</option>
          <option value="FEMALE">زن</option>
          <option value="MALE">مرد</option>
          <option value="OTHER">سایر / ترجیح می‌دهم نگویم</option>
        </select>
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm text-slate-600">تاریخ تولد (شمسی) *</legend>
        <div className="grid grid-cols-3 gap-2">
          <select name="birthDay" required defaultValue={v.birthDay} className={input} aria-label="روز">
            <option value="">روز</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i} value={i + 1}>{(i + 1).toLocaleString("fa-IR")}</option>
            ))}
          </select>
          <select name="birthMonth" required defaultValue={v.birthMonth} className={input} aria-label="ماه">
            <option value="">ماه</option>
            {JALALI_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select name="birthYear" required defaultValue={v.birthYear} className={input} aria-label="سال">
            <option value="">سال</option>
            {years.map((y) => (
              <option key={y} value={y}>{y.toLocaleString("fa-IR", { useGrouping: false })}</option>
            ))}
          </select>
        </div>
      </fieldset>
      <label>
        <span className="text-sm text-slate-600">تحصیلات</span>
        <select name="education" defaultValue={v.education} className={input}>
          <option value="">انتخاب کنید</option>
          {["زیر دیپلم", "دیپلم", "کاردانی", "کارشناسی", "کارشناسی ارشد", "دکتری"].map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-sm text-slate-600">شهر</span>
        <input name="city" defaultValue={v.city} className={input} />
      </label>

      <div className="sm:col-span-2">
        {state.error && <p className="mb-3 text-sm text-rose-600">{state.error}</p>}
        {state.ok && <p className="mb-3 text-sm text-emerald-700">✓ اطلاعات ذخیره شد.</p>}
        <button disabled={pending} className="rounded-xl bg-brand-600 px-8 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? "در حال ذخیره…" : "ذخیره‌ی اطلاعات"}
        </button>
      </div>
    </form>
  );
}
