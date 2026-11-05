"use client";

import { useActionState } from "react";
import { requestReferral, type ReferralState } from "@/server/referral";

type Props = { resultId?: string; defaultReason?: string; toClinicianId?: string };

export default function ReferralForm({ resultId, defaultReason, toClinicianId }: Props) {
  const [state, action, pending] = useActionState<ReferralState, FormData>(requestReferral, {});
  return (
    <form action={action} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
      {resultId && <input type="hidden" name="resultId" value={resultId} />}
      {toClinicianId && <input type="hidden" name="toClinicianId" value={toClinicianId} />}
      {!toClinicianId && (
        <label className="block text-sm">
          <span className="text-slate-600">ترجیح می‌دهید با چه متخصصی صحبت کنید؟</span>
          <select name="preferredKind" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="ANY">فرقی ندارد</option>
            <option value="PSYCHOLOGIST">روانشناس (مشاوره و روان‌درمانی)</option>
            <option value="PHYSICIAN">پزشک / روانپزشک (بررسی دارویی)</option>
          </select>
        </label>
      )}
      <label className="block text-sm">
        <span className="text-slate-600">به‌طور خلاصه بنویسید چه چیزی شما را نگران کرده است</span>
        <textarea
          name="reason"
          rows={5}
          defaultValue={defaultReason}
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 leading-7"
        />
      </label>
      <p className="text-xs leading-6 text-slate-500">
        با ثبت درخواست، متخصصی که درخواست را بپذیرد به نتایج تست‌ها و پرونده‌ی شما دسترسی پیدا می‌کند تا بتواند بهتر کمک کند.
      </p>
      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
      <button disabled={pending} className="rounded-xl bg-brand-600 px-6 py-2.5 text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "در حال ثبت…" : "ثبت درخواست مشاوره"}
      </button>
    </form>
  );
}
