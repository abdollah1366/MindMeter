"use client";

import { useActionState } from "react";
import { SUPPORT_TOPICS } from "@/data/support-topics";
import { createTicket, type TicketFormState } from "@/server/tickets";

type Props = {
  defaultTopic?: string;
  defaultSubject?: string;
  defaultBody?: string;
  allowDoctors?: boolean;
};

export default function TicketForm({ defaultTopic = "customers", defaultSubject = "", defaultBody = "", allowDoctors = true }: Props) {
  const [state, action, pending] = useActionState<TicketFormState, FormData>(createTicket, {});

  return (
    <form action={action} data-testid="ticket-form" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
      <label className="block text-sm">
        <span className="text-slate-600">موضوع تیکت</span>
        <select name="topic" defaultValue={defaultTopic} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          {SUPPORT_TOPICS.filter((t) => allowDoctors || t.key !== "doctors").map((t) => (
            <option key={t.key} value={t.key}>{t.icon} {t.title}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-slate-600">عنوان تیکت</span>
        <input
          name="subject"
          required
          minLength={3}
          maxLength={150}
          defaultValue={defaultSubject}
          placeholder="مثلاً: کد تایید پیامکی دریافت نمی شود"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-600">توضیحات</span>
        <textarea
          name="body"
          rows={7}
          required
          minLength={10}
          maxLength={4000}
          defaultValue={defaultBody}
          placeholder="لطفاً آنچه پیش آمده را با جزئیات بیان کنید تا سریعتر بتوانیم کمک کنیم."
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 leading-7"
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-600">اولویت</span>
        <select name="priority" defaultValue="NORMAL" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <option value="LOW">کم</option>
          <option value="NORMAL">عادی</option>
          <option value="HIGH">بالا</option>
        </select>
      </label>

      <p className="text-xs leading-6 text-slate-500">
        پاسخ تیکت به اعلانهای حساب کاربری شما ارسال می شود و از صفحه «تیکتهای من» قابل پیگیری است.
      </p>

      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}

      <button
        disabled={pending}
        className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "در حال ثبت…" : "ثبت تیکت"}
      </button>
    </form>
  );
}
