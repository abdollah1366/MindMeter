"use client";

import { useActionState } from "react";
import { replyTicket, type ReplyState } from "@/server/tickets";

export default function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyTicket, {});

  return (
    <form action={action} data-testid="ticket-reply" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="block text-sm">
        <span className="font-bold text-slate-700">نوشتن پاسخ</span>
        <textarea
          name="body"
          rows={4}
          required
          minLength={2}
          maxLength={4000}
          placeholder="پاسخ یا توضیح خود را بنویسید…"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 leading-7"
        />
      </label>
      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">✓ پاسخ ثبت شد.</p>}
      <button
        disabled={pending}
        className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "در حال ارسال…" : "ارسال پاسخ"}
      </button>
    </form>
  );
}
