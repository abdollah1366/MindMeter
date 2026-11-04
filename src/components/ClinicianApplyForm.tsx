"use client";

import { useActionState } from "react";
import { applyAsClinician, type ApplyState } from "@/server/clinician";

const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-500";

type Defaults = { kind: string; title: string; specialty: string; licenseNumber: string; bio: string; city: string; yearsExperience: string };

export default function ClinicianApplyForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAsClinician, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="text-sm text-slate-600">نوع فعالیت *</span>
        <select name="kind" required defaultValue={defaults.kind} className={input}>
          <option value="">انتخاب کنید</option>
          <option value="PSYCHOLOGIST">روانشناس / مشاور</option>
          <option value="PHYSICIAN">پزشک / روانپزشک</option>
        </select>
      </label>
      <label>
        <span className="text-sm text-slate-600">شماره‌ی نظام روانشناسی یا پزشکی *</span>
        <input name="licenseNumber" required dir="ltr" defaultValue={defaults.licenseNumber} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">عنوان نمایشی *</span>
        <input name="title" required placeholder="مثلاً: دکتر، کارشناس ارشد روانشناسی بالینی" defaultValue={defaults.title} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">تخصص *</span>
        <input name="specialty" required placeholder="مثلاً: اضطراب و افسردگی بزرگسالان" defaultValue={defaults.specialty} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">شهر</span>
        <input name="city" defaultValue={defaults.city} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">سابقه‌ی کار (سال)</span>
        <input name="yearsExperience" inputMode="numeric" defaultValue={defaults.yearsExperience} className={input} />
      </label>
      <label className="sm:col-span-2">
        <span className="text-sm text-slate-600">معرفی کوتاه</span>
        <textarea name="bio" rows={5} defaultValue={defaults.bio} className={input} />
      </label>
      <div className="sm:col-span-2">
        {state.error && <p className="mb-3 text-sm text-rose-600">{state.error}</p>}
        <button disabled={pending} className="rounded-xl bg-brand-600 px-8 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? "در حال ارسال…" : "ارسال درخواست"}
        </button>
      </div>
    </form>
  );
}
